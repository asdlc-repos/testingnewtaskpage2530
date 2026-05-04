package main

import (
	"fmt"
	"net/http"
	"os"

	"leave-management-service/handlers"
	"leave-management-service/models"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "9090"
	}

	store := models.NewStore()
	h := handlers.New(store)

	mux := http.NewServeMux()

	mux.HandleFunc("/health", h.Health)
	mux.HandleFunc("/api/employees/", func(w http.ResponseWriter, r *http.Request) {
		// Routes:
		//   GET  /api/employees/{employeeId}/balance
		//   GET  /api/employees/{employeeId}/requests
		//   POST /api/employees/{employeeId}/requests
		parts := splitPath(r.URL.Path)
		// parts: ["api", "employees", <id>, <action>]
		if len(parts) < 4 {
			http.NotFound(w, r)
			return
		}
		action := parts[3]
		switch {
		case action == "balance" && r.Method == http.MethodGet:
			h.GetBalance(w, r)
		case action == "requests" && r.Method == http.MethodGet:
			h.GetEmployeeRequests(w, r)
		case action == "requests" && r.Method == http.MethodPost:
			h.SubmitRequest(w, r)
		default:
			http.NotFound(w, r)
		}
	})

	mux.HandleFunc("/api/managers/", func(w http.ResponseWriter, r *http.Request) {
		// GET /api/managers/{managerId}/pending-requests
		parts := splitPath(r.URL.Path)
		if len(parts) < 4 || parts[3] != "pending-requests" || r.Method != http.MethodGet {
			http.NotFound(w, r)
			return
		}
		h.GetPendingRequests(w, r)
	})

	mux.HandleFunc("/api/requests/", func(w http.ResponseWriter, r *http.Request) {
		// POST /api/requests/{requestId}/approve
		// POST /api/requests/{requestId}/reject
		parts := splitPath(r.URL.Path)
		if len(parts) < 4 || r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		switch parts[3] {
		case "approve":
			h.ApproveRequest(w, r)
		case "reject":
			h.RejectRequest(w, r)
		default:
			http.NotFound(w, r)
		}
	})

	handler := handlers.LoggingMiddleware(handlers.CORSMiddleware(mux))

	fmt.Printf("leave-management-service listening on :%s\n", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		fmt.Fprintf(os.Stderr, "server error: %v\n", err)
		os.Exit(1)
	}
}

// splitPath trims leading slash and splits path into segments.
func splitPath(path string) []string {
	if len(path) > 0 && path[0] == '/' {
		path = path[1:]
	}
	result := []string{}
	for _, s := range splitOn(path, '/') {
		if s != "" {
			result = append(result, s)
		}
	}
	return result
}

func splitOn(s string, sep byte) []string {
	var parts []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == sep {
			parts = append(parts, s[start:i])
			start = i + 1
		}
	}
	parts = append(parts, s[start:])
	return parts
}
