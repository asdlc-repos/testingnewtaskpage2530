package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"leave-management-service/models"
)

type Handler struct {
	store *models.Store
	mu    sync.RWMutex
	idSeq int
}

func New(store *models.Store) *Handler {
	return &Handler{store: store}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func errJSON(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (h *Handler) generateID() string {
	h.idSeq++
	return fmt.Sprintf("REQ-%d-%d", time.Now().UnixMilli(), h.idSeq)
}

// countBusinessDays counts weekdays between startDate and endDate (inclusive).
func countBusinessDays(start, end time.Time) int {
	days := 0
	cur := start
	for !cur.After(end) {
		wd := cur.Weekday()
		if wd != time.Saturday && wd != time.Sunday {
			days++
		}
		cur = cur.AddDate(0, 0, 1)
	}
	return days
}

// CORS middleware
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Logging middleware
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lrw := &loggingResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(lrw, r)
		fmt.Printf("[%s] %s %s %d\n", time.Now().Format(time.RFC3339), r.Method, r.URL.Path, lrw.statusCode)
	})
}

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

// Health check
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GET /api/employees/{employeeId}/balance
func (h *Handler) GetBalance(w http.ResponseWriter, r *http.Request) {
	employeeID := pathSegment(r.URL.Path, 3)
	h.mu.RLock()
	balance, ok := h.store.Balances[employeeID]
	h.mu.RUnlock()
	if !ok {
		errJSON(w, http.StatusNotFound, "employee not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"employeeId":    balance.EmployeeID,
		"remainingDays": balance.RemainingDays,
	})
}

// GET /api/employees/{employeeId}/requests
func (h *Handler) GetEmployeeRequests(w http.ResponseWriter, r *http.Request) {
	employeeID := pathSegment(r.URL.Path, 3)
	h.mu.RLock()
	_, ok := h.store.Employees[employeeID]
	h.mu.RUnlock()
	if !ok {
		errJSON(w, http.StatusNotFound, "employee not found")
		return
	}
	result := []*models.LeaveRequest{}
	h.mu.RLock()
	for _, req := range h.store.Requests {
		if req.EmployeeID == employeeID {
			result = append(result, req)
		}
	}
	h.mu.RUnlock()
	writeJSON(w, http.StatusOK, result)
}

// POST /api/employees/{employeeId}/requests
func (h *Handler) SubmitRequest(w http.ResponseWriter, r *http.Request) {
	employeeID := pathSegment(r.URL.Path, 3)
	h.mu.RLock()
	employee, ok := h.store.Employees[employeeID]
	h.mu.RUnlock()
	if !ok {
		errJSON(w, http.StatusNotFound, "employee not found")
		return
	}

	var body struct {
		StartDate string `json:"startDate"`
		EndDate   string `json:"endDate"`
		Reason    string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		errJSON(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if body.StartDate == "" || body.EndDate == "" || body.Reason == "" {
		errJSON(w, http.StatusBadRequest, "startDate, endDate, and reason are required")
		return
	}

	const layout = "2006-01-02"
	start, err := time.Parse(layout, body.StartDate)
	if err != nil {
		errJSON(w, http.StatusBadRequest, "invalid startDate format, expected YYYY-MM-DD")
		return
	}
	end, err := time.Parse(layout, body.EndDate)
	if err != nil {
		errJSON(w, http.StatusBadRequest, "invalid endDate format, expected YYYY-MM-DD")
		return
	}
	if end.Before(start) {
		errJSON(w, http.StatusBadRequest, "endDate must be on or after startDate")
		return
	}

	businessDays := countBusinessDays(start, end)

	h.mu.Lock()
	defer h.mu.Unlock()

	balance := h.store.Balances[employeeID]
	if balance.RemainingDays < businessDays {
		errJSON(w, http.StatusBadRequest, fmt.Sprintf("insufficient leave balance: need %d days, have %d", businessDays, balance.RemainingDays))
		return
	}

	req := &models.LeaveRequest{
		ID:           h.generateID(),
		EmployeeID:   employeeID,
		EmployeeName: employee.Name,
		StartDate:    body.StartDate,
		EndDate:      body.EndDate,
		Reason:       body.Reason,
		Status:       "pending",
		RequestedAt:  time.Now(),
	}
	h.store.Requests[req.ID] = req
	writeJSON(w, http.StatusCreated, req)
}

// GET /api/managers/{managerId}/pending-requests
func (h *Handler) GetPendingRequests(w http.ResponseWriter, r *http.Request) {
	managerID := pathSegment(r.URL.Path, 3)
	h.mu.RLock()
	_, ok := h.store.Managers[managerID]
	reportIDs := h.store.DirectReports[managerID]
	h.mu.RUnlock()
	if !ok {
		errJSON(w, http.StatusNotFound, "manager not found")
		return
	}

	reportSet := make(map[string]bool, len(reportIDs))
	for _, id := range reportIDs {
		reportSet[id] = true
	}

	result := []*models.LeaveRequest{}
	h.mu.RLock()
	for _, req := range h.store.Requests {
		if req.Status == "pending" && reportSet[req.EmployeeID] {
			result = append(result, req)
		}
	}
	h.mu.RUnlock()
	writeJSON(w, http.StatusOK, result)
}

// POST /api/requests/{requestId}/approve
func (h *Handler) ApproveRequest(w http.ResponseWriter, r *http.Request) {
	requestID := pathSegment(r.URL.Path, 3)
	var body struct {
		ManagerID string `json:"managerId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ManagerID == "" {
		errJSON(w, http.StatusBadRequest, "managerId is required")
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	req, ok := h.store.Requests[requestID]
	if !ok {
		errJSON(w, http.StatusNotFound, "request not found")
		return
	}
	if !h.isDirectReport(body.ManagerID, req.EmployeeID) {
		errJSON(w, http.StatusForbidden, "manager not authorized for this employee")
		return
	}

	const layout = "2006-01-02"
	start, _ := time.Parse(layout, req.StartDate)
	end, _ := time.Parse(layout, req.EndDate)
	businessDays := countBusinessDays(start, end)

	balance := h.store.Balances[req.EmployeeID]
	if balance.RemainingDays < businessDays {
		errJSON(w, http.StatusBadRequest, "insufficient leave balance")
		return
	}
	balance.RemainingDays -= businessDays

	now := time.Now()
	req.Status = "approved"
	req.ReviewedAt = &now
	req.ReviewedBy = body.ManagerID

	writeJSON(w, http.StatusOK, req)
}

// POST /api/requests/{requestId}/reject
func (h *Handler) RejectRequest(w http.ResponseWriter, r *http.Request) {
	requestID := pathSegment(r.URL.Path, 3)
	var body struct {
		ManagerID string `json:"managerId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ManagerID == "" {
		errJSON(w, http.StatusBadRequest, "managerId is required")
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	req, ok := h.store.Requests[requestID]
	if !ok {
		errJSON(w, http.StatusNotFound, "request not found")
		return
	}
	if !h.isDirectReport(body.ManagerID, req.EmployeeID) {
		errJSON(w, http.StatusForbidden, "manager not authorized for this employee")
		return
	}

	now := time.Now()
	req.Status = "rejected"
	req.ReviewedAt = &now
	req.ReviewedBy = body.ManagerID

	writeJSON(w, http.StatusOK, req)
}

// isDirectReport checks if employeeID is a direct report of managerID (must be called with lock held).
func (h *Handler) isDirectReport(managerID, employeeID string) bool {
	for _, id := range h.store.DirectReports[managerID] {
		if id == employeeID {
			return true
		}
	}
	return false
}

// pathSegment returns the nth segment (0-indexed) of a URL path split by "/".
// e.g. "/api/employees/E001/balance" -> segments: ["", "api", "employees", "E001", "balance"]
func pathSegment(path string, n int) string {
	parts := strings.Split(path, "/")
	if n < len(parts) {
		return parts[n]
	}
	return ""
}
