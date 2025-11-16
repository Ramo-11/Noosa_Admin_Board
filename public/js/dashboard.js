class Dashboard {
    constructor() {
        this.currentTab = this.getStoredTab() || 'users';
        this.filters = {
            users: { search: '', sort: 'fullName-asc' },
            tutors: { search: '', sort: 'fullName-asc' },
            appointments: {
                search: '',
                status: '',
                customer: '',
                tutor: '',
                sort: 'appointmentDate-desc',
            },
            invoices: { search: '', status: '', customer: '', tutor: '', sort: 'dueDate-desc' },
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDateTime();
        this.showTab(this.currentTab);
        this.setupFilters();

        // Update time every minute
        setInterval(() => this.updateDateTime(), 60000);
    }

    // Get stored tab from localStorage
    getStoredTab() {
        try {
            return localStorage.getItem('currentTab');
        } catch (e) {
            // If localStorage is not available, use sessionStorage as fallback
            try {
                return sessionStorage.getItem('currentTab');
            } catch (e) {
                return null;
            }
        }
    }

    // Store current tab in localStorage
    storeCurrentTab(tabName) {
        try {
            localStorage.setItem('currentTab', tabName);
        } catch (e) {
            // Fallback to sessionStorage if localStorage is not available
            try {
                sessionStorage.setItem('currentTab', tabName);
            } catch (e) {
                // If both fail, just continue without storing
            }
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach((button) => {
            button.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.showTab(tabName);
            });
        });

        // Action buttons using event delegation
        document.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const type = e.target.dataset.type;
            const id = e.target.dataset.id;

            if (!action || !type) return;

            switch (action) {
                case 'create':
                    this.showCreateForm(type);
                    break;
                case 'edit':
                    this.startEditing(type, id);
                    break;
                case 'save':
                    this.saveEdit(type, id);
                    break;
                case 'cancel':
                    this.cancelEdit(type, id);
                    break;
                case 'delete':
                    this.deleteEntry(type, id);
                    break;
            }
        });

        // Modal overlay click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal();
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('create-form')) {
                e.preventDefault();
                const type = e.target.dataset.type;
                this.createEntry(e.target, type);
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    setupFilters() {
        // Setup filters for all tabs
        ['users', 'tutors', 'appointments', 'invoices'].forEach((tab) => {
            this.setupTabFilters(tab);
        });
    }

    setupTabFilters(tab) {
        // Search input
        const searchInput = document.getElementById(`${tab}-search`);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters[tab].search = e.target.value.toLowerCase();
                this.applyFilters(tab);
            });
        }

        // Sort select
        const sortSelect = document.getElementById(`${tab}-sort`);
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.filters[tab].sort = e.target.value;
                this.applyFilters(tab);
            });
        }

        // Tutor filter (for appointments and invoices)
        const tutorFilter = document.getElementById(`${tab}-tutor-filter`);
        if (tutorFilter) {
            tutorFilter.addEventListener('change', (e) => {
                this.filters[tab].tutor = e.target.value.toLowerCase();
                this.applyFilters(tab);
            });
        }

        // Status filter (for appointments and invoices)
        const statusFilter = document.getElementById(`${tab}-status-filter`);
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters[tab].status = e.target.value.toLowerCase();
                this.applyFilters(tab);
            });
        }

        // Customer filter (for appointments and invoices)
        const customerFilter = document.getElementById(`${tab}-customer-filter`);
        if (customerFilter) {
            customerFilter.addEventListener('change', (e) => {
                this.filters[tab].customer = e.target.value.toLowerCase();
                this.applyFilters(tab);
            });
        }

        // Clear filters button
        const clearButton = document.getElementById(`${tab}-clear-filters`);
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearFilters(tab);
            });
        }
    }

    applyFilters(tab) {
        const rows = document.querySelectorAll(`#${tab} tbody tr`);
        const filters = this.filters[tab];
        let visibleCount = 0;

        // Convert rows to array for sorting
        const rowsArray = Array.from(rows);

        // Filter rows
        const filteredRows = rowsArray.filter((row) => {
            let show = true;

            // Search filter
            if (filters.search) {
                const searchableText = this.getSearchableText(row, tab).toLowerCase();
                show = show && searchableText.includes(filters.search);
            }

            // Status filter
            if (filters.status && tab !== 'users') {
                const rowStatus = row.dataset.status || row.dataset.paid;
                show = show && rowStatus === filters.status;
            }

            // Customer filter
            if (filters.customer && tab !== 'users') {
                const rowCustomer = row.dataset.customer;
                show = show && rowCustomer === filters.customer;
            }

            // Tutor filter
            if (filters.tutor && tab !== 'users' && tab !== 'tutors') {
                const rowTutor = row.dataset.tutor;
                show = show && rowTutor === filters.tutor;
            }

            return show;
        });

        // Sort filtered rows
        const sortedRows = this.sortRows(filteredRows, filters.sort, tab);

        // Hide all rows first
        rowsArray.forEach((row) => {
            row.classList.add('hidden');
        });

        // Show and reorder filtered rows
        const tbody = document.querySelector(`#${tab} tbody`);
        sortedRows.forEach((row, index) => {
            row.classList.remove('hidden');
            tbody.appendChild(row); // This reorders the row
            visibleCount++;
        });

        // Update count
        this.updateResultsCount(tab, visibleCount);

        // Update summary stats for visible items
        this.updateVisibleSummary(tab, sortedRows);

        // Toggle mark all as paid button visibility
        if (tab === 'invoices') {
            this.toggleMarkAllPaidButton(sortedRows);
        }

        // Show/hide no results message
        this.toggleNoResultsMessage(tab, visibleCount === 0);
    }

    toggleMarkAllPaidButton(visibleRows) {
        const markPaidBtn = document.getElementById('mark-all-paid-btn');
        if (!markPaidBtn) return;

        const hasUnpaidInvoices = visibleRows.some((row) => row.dataset.paid === 'unpaid');

        if (hasUnpaidInvoices) {
            markPaidBtn.style.display = 'inline-flex';
        } else {
            markPaidBtn.style.display = 'none';
        }
    }

    updateVisibleSummary(tab, visibleRows) {
        let summaryHtml = '';

        if (tab === 'invoices') {
            let totalPaid = 0;
            let totalUnpaid = 0;
            let paidCount = 0;
            let unpaidCount = 0;

            visibleRows.forEach((row) => {
                const total = parseFloat(row.dataset.total) || 0;
                const isPaid = row.dataset.paid === 'paid';

                if (isPaid) {
                    totalPaid += total;
                    paidCount++;
                } else {
                    totalUnpaid += total;
                    unpaidCount++;
                }
            });

            summaryHtml = `
            <div class="visible-summary">
                <span class="summary-item paid">Paid: $${totalPaid.toFixed(2)} (${paidCount})</span>
                <span class="summary-item unpaid">Unpaid: $${totalUnpaid.toFixed(
                    2
                )} (${unpaidCount})</span>
                <span class="summary-item total">Total: $${(totalPaid + totalUnpaid).toFixed(
                    2
                )}</span>
            </div>
        `;
        } else if (tab === 'appointments') {
            let scheduled = 0;
            let completed = 0;
            let cancelled = 0;

            visibleRows.forEach((row) => {
                const status = row.dataset.status;
                if (status === 'scheduled') scheduled++;
                else if (status === 'completed') completed++;
                else if (status === 'cancelled') cancelled++;
            });

            summaryHtml = `
            <div class="visible-summary">
                <span class="summary-item scheduled">Scheduled: ${scheduled}</span>
                <span class="summary-item completed">Completed: ${completed}</span>
                <span class="summary-item cancelled">Cancelled: ${cancelled}</span>
            </div>
        `;
        }

        // Insert or update summary
        const filterActions = document.querySelector(`#${tab} .filter-actions`);
        let existingSummary = document.querySelector(`#${tab} .visible-summary`);

        if (existingSummary) {
            existingSummary.remove();
        }

        if (summaryHtml && filterActions) {
            filterActions.insertAdjacentHTML('beforebegin', summaryHtml);
        }
    }

    getSearchableText(row, tab) {
        switch (tab) {
            case 'users':
                return `${row.dataset.name} ${row.dataset.email} ${row.dataset.phone}`;
            case 'tutors':
                return `${row.dataset.name} ${row.dataset.email} ${row.dataset.phone}`;
            case 'appointments':
                return `${row.dataset.customerName} ${row.dataset.customer} ${row.dataset.course}`;
            case 'invoices':
                return `${row.dataset.invoiceNumber} ${row.dataset.customerName} ${row.dataset.customer}`;
            default:
                return '';
        }
    }

    async markAllVisibleAsPaid(tab) {
        if (tab !== 'invoices') return;

        const visibleRows = Array.from(document.querySelectorAll(`#${tab} tbody tr`)).filter(
            (row) => !row.classList.contains('hidden')
        );

        const unpaidInvoices = visibleRows.filter((row) => row.dataset.paid === 'unpaid');

        if (unpaidInvoices.length === 0) {
            alert('No unpaid invoices to mark as paid');
            return;
        }

        if (!confirm(`Mark ${unpaidInvoices.length} invoice(s) as paid?`)) return;

        try {
            const updatePromises = unpaidInvoices.map((row) => {
                const id = row.dataset.id;
                return this.makeRequest(`/index/invoices/${id}/mark-paid`, 'PUT');
            });

            await Promise.all(updatePromises);
            this.showNotification('success', `${unpaidInvoices.length} invoice(s) marked as paid`);
        } catch (error) {
            this.showNotification('error', 'Failed to mark invoices as paid');
        }
    }

    sortRows(rows, sortOption, tab) {
        const [field, direction] = sortOption.split('-');

        return rows.sort((a, b) => {
            let aValue, bValue;

            switch (field) {
                case 'fullName':
                    aValue = a.dataset.name;
                    bValue = b.dataset.name;
                    break;
                case 'email':
                    aValue = a.dataset.email;
                    bValue = b.dataset.email;
                    break;
                case 'customer':
                    aValue = a.dataset.customerName || a.dataset.customer;
                    bValue = b.dataset.customerName || b.dataset.customer;
                    break;
                case 'tutor':
                    aValue = a.dataset.tutorName || a.dataset.tutor;
                    bValue = b.dataset.tutorName || b.dataset.tutor;
                    break;
                case 'courseName':
                    aValue = a.dataset.course;
                    bValue = b.dataset.course;
                    break;
                case 'appointmentDate':
                    aValue = new Date(a.dataset.date);
                    bValue = new Date(b.dataset.date);
                    break;
                case 'dueDate':
                    aValue = new Date(a.dataset.dueDate);
                    bValue = new Date(b.dataset.dueDate);
                    break;
                case 'total':
                    aValue = parseFloat(a.dataset.total) || 0;
                    bValue = parseFloat(b.dataset.total) || 0;
                    break;
                case 'status':
                    aValue = a.dataset.status;
                    bValue = b.dataset.status;
                    break;
                case 'isPaid':
                    aValue = a.dataset.paid === 'paid' ? 1 : 0;
                    bValue = b.dataset.paid === 'paid' ? 1 : 0;
                    break;
                case 'invoiceNumber':
                    aValue = a.dataset.invoiceNumber;
                    bValue = b.dataset.invoiceNumber;
                    break;
                case 'createdAt':
                    aValue = new Date(a.dataset.created);
                    bValue = new Date(b.dataset.created);
                    break;
                default:
                    aValue = '';
                    bValue = '';
            }

            // Handle different data types
            if (aValue instanceof Date && bValue instanceof Date) {
                return direction === 'asc' ? aValue - bValue : bValue - aValue;
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                return direction === 'asc' ? aValue - bValue : bValue - aValue;
            } else {
                // String comparison
                aValue = String(aValue || '').toLowerCase();
                bValue = String(bValue || '').toLowerCase();
                if (direction === 'asc') {
                    return aValue.localeCompare(bValue);
                } else {
                    return bValue.localeCompare(aValue);
                }
            }
        });
    }

    updateResultsCount(tab, count) {
        const countElement = document.getElementById(`${tab}-count`);
        if (countElement) {
            const itemName = tab === 'users' ? 'user' : tab.slice(0, -1); // Remove 's' from end
            countElement.textContent = `${count} ${itemName}${count !== 1 ? 's' : ''}`;
        }
    }

    toggleNoResultsMessage(tab, show) {
        let noResultsDiv = document.querySelector(`#${tab} .no-results`);

        if (show && !noResultsDiv) {
            // Create no results message
            noResultsDiv = document.createElement('div');
            noResultsDiv.className = 'no-results';
            noResultsDiv.innerHTML = `
                <div class="no-results-icon">🔍</div>
                <div>No results found matching your filters</div>
            `;

            const tableContainer = document.querySelector(`#${tab} .table-container`);
            tableContainer.appendChild(noResultsDiv);
        } else if (!show && noResultsDiv) {
            noResultsDiv.remove();
        }
    }

    clearFilters(tab) {
        // Reset filter values
        this.filters[tab] = {
            search: '',
            sort:
                tab === 'users' || tab === 'tutors'
                    ? 'fullName-asc'
                    : tab === 'appointments'
                    ? 'appointmentDate-desc'
                    : 'dueDate-desc',
        };

        if (tab !== 'users' && tab !== 'tutors') {
            this.filters[tab].status = '';
            this.filters[tab].customer = '';
            this.filters[tab].tutor = '';
        }

        // Reset form elements
        const searchInput = document.getElementById(`${tab}-search`);
        if (searchInput) searchInput.value = '';

        const sortSelect = document.getElementById(`${tab}-sort`);
        if (sortSelect) sortSelect.value = this.filters[tab].sort;

        const statusFilter = document.getElementById(`${tab}-status-filter`);
        if (statusFilter) statusFilter.value = '';

        const customerFilter = document.getElementById(`${tab}-customer-filter`);
        if (customerFilter) customerFilter.value = '';

        const tutorFilter = document.getElementById(`${tab}-tutor-filter`);
        if (tutorFilter) tutorFilter.value = '';

        // Apply cleared filters
        this.applyFilters(tab);
    }

    updateDateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        };
        document.getElementById('current-time').textContent = now.toLocaleDateString(
            'en-US',
            options
        );
    }

    showTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach((button) => {
            button.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach((content) => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;
        this.storeCurrentTab(tabName);

        // Add mark all as paid button for invoices
        if (tabName === 'invoices') {
            const sectionHeader = document.querySelector('#invoices .section-header');
            let markPaidBtn = document.getElementById('mark-all-paid-btn');

            if (!markPaidBtn) {
                markPaidBtn = document.createElement('button');
                markPaidBtn.id = 'mark-all-paid-btn';
                markPaidBtn.className = 'btn btn-primary';
                markPaidBtn.style.display = 'none';
                markPaidBtn.innerHTML = 'Mark All as Paid';
                markPaidBtn.onclick = () => this.markAllVisibleAsPaid('invoices');

                const createBtn = sectionHeader.querySelector('[data-action="create"]');
                createBtn.parentNode.insertBefore(markPaidBtn, createBtn);
            }
        }

        // Apply filters for the current tab
        this.applyFilters(tabName);

        // Update stats when switching tabs
        if (window.statsManager) {
            window.statsManager.refresh();
        }
    }

    showCreateForm(type) {
        const formHtml = this.getCreateFormHtml(type);
        const modalContainer = document.getElementById('modal-container');
        const overlay = document.getElementById('modal-overlay');

        modalContainer.innerHTML = formHtml;
        overlay.style.display = 'block';
        modalContainer.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Special handling for invoice form
        if (type === 'invoice') {
            this.setupInvoiceForm();
        }

        // Populate tutor dropdown for appointments and invoices
        if (type === 'appointment' || type === 'invoice') {
            const tutorSelect = document.getElementById('tutorId');
            if (tutorSelect) {
                this.populateTutorDropdown(tutorSelect);
            }
        }

        // Focus first input
        setTimeout(() => {
            const firstInput = modalContainer.querySelector('input:not([readonly]), select');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    async populateTutorDropdown(selectElement) {
        try {
            const response = await fetch('/index/tutors');
            const tutors = await response.json();

            tutors.forEach((tutor) => {
                const option = document.createElement('option');
                option.value = tutor._id;
                option.textContent = `${tutor.fullName} (${tutor.email})`;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading tutors:', error);
        }
    }

    async setupInvoiceForm() {
        // Generate initial invoice number
        await this.generateInvoiceNumber();

        // Setup regenerate button
        const regenerateBtn = document.getElementById('regenerate-invoice-btn');
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', () => {
                this.generateInvoiceNumber();
            });
        }

        // Auto-fill due date when session date changes
        const sessionDateInput = document.getElementById('sessionDate');
        const dueDateInput = document.getElementById('dueDate');
        if (sessionDateInput && dueDateInput) {
            sessionDateInput.addEventListener('change', (e) => {
                dueDateInput.value = e.target.value;
            });
        }
    }

    async generateInvoiceNumber() {
        const invoiceNumberInput = document.getElementById('invoiceNumber');
        const regenerateBtn = document.getElementById('regenerate-invoice-btn');

        if (!invoiceNumberInput) return;

        try {
            // Show loading state
            if (regenerateBtn) {
                regenerateBtn.disabled = true;
                regenerateBtn.textContent = '🔄 Generating...';
            }
            invoiceNumberInput.value = 'Generating...';

            const response = await fetch('/api/generate-invoice-number');
            const data = await response.json();

            if (response.ok) {
                invoiceNumberInput.value = data.invoiceNumber;
                // Remove this line - don't show notification when just generating a number for the form
                // this.showNotification('success', `Generated invoice number: ${data.invoiceNumber}`);
            } else {
                throw new Error(data.message || 'Failed to generate invoice number');
            }
        } catch (error) {
            console.error('Error generating invoice number:', error);
            invoiceNumberInput.value = '';
            // Change this to just show an alert instead of using showNotification
            alert('Failed to generate invoice number. Please try again.');
        } finally {
            // Reset button state
            if (regenerateBtn) {
                regenerateBtn.disabled = false;
                regenerateBtn.textContent = '🔄 Generate New';
            }
        }
    }

    closeModal() {
        const modalContainer = document.getElementById('modal-container');
        const overlay = document.getElementById('modal-overlay');

        modalContainer.innerHTML = '';
        overlay.style.display = 'none';
        modalContainer.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    getCreateFormHtml(type) {
        const forms = {
            user: `
            <div class="create-form-container">
                <form class="create-form" data-type="user">
                    <div class="form-header">
                        <h3>Create New User</h3>
                        <button type="button" class="btn-close" onclick="dashboard.closeModal()">×</button>
                    </div>
                    <div class="form-body">
                        <div class="form-group">
                            <label for="fullName">Full Name *</label>
                            <input type="text" id="fullName" name="fullName" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email *</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="phoneNumber">Phone Number</label>
                            <input type="text" id="phoneNumber" name="phoneNumber">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-light" onclick="dashboard.closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create User</button>
                    </div>
                </form>
            </div>
        `,
            tutor: `
            <div class="create-form-container">
                <form class="create-form" data-type="tutor">
                    <div class="form-header">
                        <h3>Create New Tutor</h3>
                        <button type="button" class="btn-close" onclick="dashboard.closeModal()">×</button>
                    </div>
                    <div class="form-body">
                        <div class="form-group">
                            <label for="fullName">Full Name *</label>
                            <input type="text" id="fullName" name="fullName" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email *</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="phoneNumber">Phone Number</label>
                            <input type="text" id="phoneNumber" name="phoneNumber">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-light" onclick="dashboard.closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Tutor</button>
                    </div>
                </form>
            </div>
        `,
            appointment: `
            <div class="create-form-container">
                <form class="create-form" data-type="appointment">
                    <div class="form-header">
                        <h3>Create New Appointment</h3>
                        <button type="button" class="btn-close" onclick="dashboard.closeModal()">×</button>
                    </div>
                    <div class="form-body">
                        <div class="form-group">
                            <label for="customerEmail">Customer Email *</label>
                            <input type="email" id="customerEmail" name="customerEmail" required>
                        </div>
                        <div class="form-group">
                            <label for="tutorId">Tutor *</label>
                            <select id="tutorId" name="tutorId" required>
                                <option value="">Select a tutor...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="courseName">Course Name *</label>
                            <input type="text" id="courseName" name="courseName" required>
                        </div>
                        <div class="form-group">
                            <label for="appointmentDate">Date *</label>
                            <input type="date" id="appointmentDate" name="appointmentDate" required>
                        </div>
                        <div class="form-group">
                            <label for="appointmentTime">Time *</label>
                            <input type="text" id="appointmentTime" name="appointmentTime" 
                                   placeholder="12:00 PM" required 
                                   pattern="^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$" 
                                   title="Enter time in the format HH:MM AM/PM">
                        </div>
                        <div class="form-group">
                            <label for="status">Status *</label>
                            <select id="status" name="status" required>
                                <option value="Scheduled">Scheduled</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-light" onclick="dashboard.closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Appointment</button>
                    </div>
                </form>
            </div>
        `,
            invoice: `
            <div class="create-form-container">
                <form class="create-form" data-type="invoice">
                    <div class="form-header">
                        <h3>Create New Invoice</h3>
                        <button type="button" class="btn-close" onclick="dashboard.closeModal()">×</button>
                    </div>
                    <div class="form-body">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="invoiceNumber">Invoice Number</label>
                                <div class="invoice-number-container">
                                    <input type="text" id="invoiceNumber" name="invoiceNumber" required>
                                    <button type="button" class="btn btn-sm btn-secondary" id="regenerate-invoice-btn">
                                        🔄 Generate New
                                    </button>
                                </div>
                                <small class="form-hint">Auto-generated 5-digit unique number</small>
                            </div>
                            <div class="form-group">
                                <label for="customerEmail">Customer Email *</label>
                                <input type="email" id="customerEmail" name="customerEmail" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="tutorId">Tutor *</label>
                            <select id="tutorId" name="tutorId" required>
                                <option value="">Select a tutor...</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="sessionDate">Session Date *</label>
                                <input type="date" id="sessionDate" name="sessionDate" required>
                            </div>
                            <div class="form-group">
                                <label for="dueDate">Due Date *</label>
                                <input type="date" id="dueDate" name="dueDate" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="hours">Hours *</label>
                                <input type="number" id="hours" name="hours" required min="1" step="0.5">
                            </div>
                            <div class="form-group">
                                <label for="price">Price per Hour *</label>
                                <input type="number" id="price" name="price" required min="0" step="0.01">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="isPaid">Payment Status *</label>
                            <select id="isPaid" name="isPaid" required>
                                <option value="false">Not Paid</option>
                                <option value="true">Paid</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-light" onclick="dashboard.closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Invoice</button>
                    </div>
                </form>
            </div>
        `,
        };

        return forms[type] || '';
    }

    startEditing(type, id) {
        const row = document.getElementById(`${type}-row-${id}`);
        if (!row) return;

        row.classList.add('editing');

        // Store original values for cancel functionality
        const originalValues = {};
        row.querySelectorAll('.edit-mode input, .edit-mode select').forEach((input) => {
            originalValues[input.name] = input.value;
        });
        row._originalValues = originalValues;
    }

    cancelEdit(type, id) {
        const row = document.getElementById(`${type}-row-${id}`);
        if (!row) return;

        row.classList.remove('editing');

        // Restore original values
        if (row._originalValues) {
            Object.keys(row._originalValues).forEach((name) => {
                const input = row.querySelector(
                    `.edit-mode input[name="${name}"], .edit-mode select[name="${name}"]`
                );
                if (input) {
                    input.value = row._originalValues[name];
                }
            });
        }
    }

    async saveEdit(type, id) {
        const row = document.getElementById(`${type}-row-${id}`);
        if (!row) return;

        const saveButton = row.querySelector('[data-action="save"]');
        if (saveButton) {
            saveButton.classList.add('loading');
            saveButton.disabled = true;
        }

        try {
            const data = this.collectEditData(type, row);
            const response = await this.makeRequest(`/index/${type}s/${id}`, 'PUT', data);

            if (response.ok) {
                const result = await response.json();
                this.showNotification('success', result.message);
            } else {
                const error = await response.json();
                this.showNotification('error', error.message);
                this.cancelEdit(type, id);
            }
        } catch (error) {
            this.showNotification('error', 'An error occurred while saving');
            this.cancelEdit(type, id);
        } finally {
            if (saveButton) {
                saveButton.classList.remove('loading');
                saveButton.disabled = false;
            }
        }
    }

    collectEditData(type, row) {
        const data = {};

        switch (type) {
            case 'user':
                data.fullName = row.querySelector('input[name="fullName"]').value;
                data.email = row.querySelector('input[name="email"]').value;
                data.phoneNumber = row.querySelector('input[name="phoneNumber"]').value;
                data.isAdmin = row.querySelector('select[name="isAdmin"]').value === 'true';
                break;
            case 'tutor':
                data.fullName = row.querySelector('input[name="fullName"]').value;
                data.email = row.querySelector('input[name="email"]').value;
                data.phoneNumber = row.querySelector('input[name="phoneNumber"]').value;
                data.isActive = row.querySelector('select[name="isActive"]').value === 'true';
                break;
            case 'appointment':
                data.courseName = row.querySelector('input[name="courseName"]').value;
                data.appointmentDate = row.querySelector('input[name="appointmentDate"]').value;
                data.appointmentTime = row.querySelector('input[name="appointmentTime"]').value;
                data.status = row.querySelector('select[name="status"]').value;
                const tutorSelect = row.querySelector('select[name="tutorId"]');
                if (tutorSelect) {
                    data.tutorId = tutorSelect.value;
                }
                break;
            case 'invoice':
                data.invoiceNumber = row.querySelector('input[name="invoiceNumber"]').value;
                data.sessionDate = row.querySelector('input[name="sessionDate"]').value;
                data.dueDate = row.querySelector('input[name="dueDate"]').value;
                data.hours = parseFloat(row.querySelector('input[name="hours"]').value);
                data.price = parseFloat(row.querySelector('input[name="price"]').value);
                data.isPaid = row.querySelector('select[name="isPaid"]').value === 'true';
                const invoiceTutorSelect = row.querySelector('select[name="tutorId"]');
                if (invoiceTutorSelect) {
                    data.tutorId = invoiceTutorSelect.value;
                }
                break;
        }

        return data;
    }

    async createEntry(form, type) {
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.classList.add('loading');
            submitButton.disabled = true;
        }

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Convert boolean and number fields
            if (type === 'invoice') {
                data.hours = parseFloat(data.hours);
                data.price = parseFloat(data.price);
                data.isPaid = data.isPaid === 'true';
            }

            const response = await this.makeRequest(`/index/${type}s`, 'POST', data);

            if (response.ok) {
                const result = await response.json();
                this.showNotification('success', result.message);
                this.closeModal();
            } else {
                const error = await response.json();
                this.showNotification('error', error.message);
            }
        } catch (error) {
            this.showNotification('error', 'An error occurred while creating the entry');
        } finally {
            if (submitButton) {
                submitButton.classList.remove('loading');
                submitButton.disabled = false;
            }
        }
    }

    async deleteEntry(type, id) {
        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

        try {
            const response = await this.makeRequest(`/index/${type}s/${id}`, 'DELETE');

            if (response.ok) {
                const result = await response.json();
                this.showNotification('success', result.message);
            } else {
                const error = await response.json();
                this.showNotification('error', error.message);
            }
        } catch (error) {
            this.showNotification('error', 'An error occurred while deleting');
        }
    }

    async makeRequest(url, method, data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        return fetch(url, options);
    }

    showNotification(type, message) {
        const notification = document.getElementById('notification');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.display = 'block';

        // Store current tab before reload
        this.storeCurrentTab(this.currentTab);

        setTimeout(() => {
            notification.style.display = 'none';
            window.location.reload();
        }, 1000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});
