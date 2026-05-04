package models

import "time"

type Employee struct {
	ID        string
	Name      string
	ManagerID string
}

type Manager struct {
	ID   string
	Name string
}

type LeaveBalance struct {
	EmployeeID    string
	RemainingDays int
}

type LeaveRequest struct {
	ID           string     `json:"id"`
	EmployeeID   string     `json:"employeeId"`
	EmployeeName string     `json:"employeeName"`
	StartDate    string     `json:"startDate"`
	EndDate      string     `json:"endDate"`
	Reason       string     `json:"reason"`
	Status       string     `json:"status"`
	RequestedAt  time.Time  `json:"requestedAt"`
	ReviewedAt   *time.Time `json:"reviewedAt,omitempty"`
	ReviewedBy   string     `json:"reviewedBy,omitempty"`
}

type Store struct {
	Employees    map[string]*Employee
	Managers     map[string]*Manager
	Balances     map[string]*LeaveBalance
	Requests     map[string]*LeaveRequest
	DirectReports map[string][]string // managerID -> []employeeID
}

func NewStore() *Store {
	s := &Store{
		Employees:    make(map[string]*Employee),
		Managers:     make(map[string]*Manager),
		Balances:     make(map[string]*LeaveBalance),
		Requests:     make(map[string]*LeaveRequest),
		DirectReports: make(map[string][]string),
	}

	// Seed managers
	s.Managers["M001"] = &Manager{ID: "M001", Name: "Alice Manager"}
	s.Managers["M002"] = &Manager{ID: "M002", Name: "Bob Manager"}

	// Seed employees
	employees := []Employee{
		{ID: "E001", Name: "Charlie Employee", ManagerID: "M001"},
		{ID: "E002", Name: "Diana Employee", ManagerID: "M001"},
		{ID: "E003", Name: "Eve Employee", ManagerID: "M001"},
		{ID: "E004", Name: "Frank Employee", ManagerID: "M002"},
		{ID: "E005", Name: "Grace Employee", ManagerID: "M002"},
	}
	for i := range employees {
		e := &employees[i]
		s.Employees[e.ID] = e
		s.Balances[e.ID] = &LeaveBalance{EmployeeID: e.ID, RemainingDays: 20}
		s.DirectReports[e.ManagerID] = append(s.DirectReports[e.ManagerID], e.ID)
	}

	return s
}
