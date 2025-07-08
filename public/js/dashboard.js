class Dashboard {
    constructor() {
        this.currentTab = 'users';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDateTime();
        this.showTab('users');
        
        // Update time every minute
        setInterval(() => this.updateDateTime(), 60000);
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
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

    updateDateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('current-time').textContent = now.toLocaleDateString('en-US', options);
    }

    showTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;
    }

    showCreateForm(type) {
        const formHtml = this.getCreateFormHtml(type);
        const modalContainer = document.getElementById('modal-container');
        const overlay = document.getElementById('modal-overlay');

        modalContainer.innerHTML = formHtml;
        overlay.style.display = 'block';
        modalContainer.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Focus first input
        setTimeout(() => {
            const firstInput = modalContainer.querySelector('input, select');
            if (firstInput) firstInput.focus();
        }, 100);
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
                                    <label for="invoiceNumber">Invoice Number *</label>
                                    <input type="text" id="invoiceNumber" name="invoiceNumber" required>
                                </div>
                                <div class="form-group">
                                    <label for="customerEmail">Customer Email *</label>
                                    <input type="email" id="customerEmail" name="customerEmail" required>
                                </div>
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
            `
        };

        return forms[type] || '';
    }

    startEditing(type, id) {
        const row = document.getElementById(`${type}-row-${id}`);
        if (!row) return;

        row.classList.add('editing');
        
        // Store original values for cancel functionality
        const originalValues = {};
        row.querySelectorAll('.edit-mode input, .edit-mode select').forEach(input => {
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
            Object.keys(row._originalValues).forEach(name => {
                const input = row.querySelector(`.edit-mode input[name="${name}"], .edit-mode select[name="${name}"]`);
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
                setTimeout(() => window.location.reload(), 1500);
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
                break;
            case 'appointment':
                data.courseName = row.querySelector('input[name="courseName"]').value;
                data.appointmentDate = row.querySelector('input[name="appointmentDate"]').value;
                data.appointmentTime = row.querySelector('input[name="appointmentTime"]').value;
                data.status = row.querySelector('select[name="status"]').value;
                break;
            case 'invoice':
                data.invoiceNumber = row.querySelector('input[name="invoiceNumber"]').value;
                data.sessionDate = row.querySelector('input[name="sessionDate"]').value;
                data.dueDate = row.querySelector('input[name="dueDate"]').value;
                data.hours = parseFloat(row.querySelector('input[name="hours"]').value);
                data.price = parseFloat(row.querySelector('input[name="price"]').value);
                data.isPaid = row.querySelector('select[name="isPaid"]').value === 'true';
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
                setTimeout(() => window.location.reload(), 1500);
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
                setTimeout(() => window.location.reload(), 1500);
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
                'Content-Type': 'application/json'
            }
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

        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});