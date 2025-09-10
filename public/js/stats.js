// public/js/stats.js
class StatsManager {
    constructor() {
        this.stats = {
            totalRevenue: 0,
            totalUnpaidAmount: 0,
            userCount: 0,
            appointmentCount: 0,
            unpaidInvoiceCount: 0,
            paidInvoiceCount: 0,
            futureAppointments: 0,
            completedAppointments: 0,
            cancelledAppointments: 0,
            courseCategories: {}
        };
        this.init();
    }

    init() {
        this.calculateStats();
        this.renderStats();
    }

    calculateStats() {
        // Reset all stats before recalculating
        this.stats = {
            totalRevenue: 0,
            totalUnpaidAmount: 0,
            userCount: 0,
            appointmentCount: 0,
            unpaidInvoiceCount: 0,
            paidInvoiceCount: 0,
            futureAppointments: 0,
            completedAppointments: 0,
            cancelledAppointments: 0,
            courseCategories: {}
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // User stats
        const userRows = document.querySelectorAll('#users tbody tr');
        this.stats.userCount = userRows.length;

        // Appointment stats
        const appointmentRows = document.querySelectorAll('#appointments tbody tr');
        this.stats.appointmentCount = appointmentRows.length;
        
        appointmentRows.forEach(row => {
            const status = row.dataset.status;
            const dateStr = row.dataset.date;
            const courseName = row.dataset.course;
            
            // Count by status
            if (status === 'scheduled') {
                // Check if future appointment
                const appointmentDate = new Date(dateStr);
                if (appointmentDate >= today) {
                    this.stats.futureAppointments++;
                }
            } else if (status === 'completed') {
                this.stats.completedAppointments++;
            } else if (status === 'cancelled') {
                this.stats.cancelledAppointments++;
            }
            
            // Count course categories (simplified - you can enhance this)
            if (courseName) {
                const course = courseName.toLowerCase();
                // Extract category from course name (assuming format like "Math 101" or "English Basics")
                const category = course.split(' ')[0];
                this.stats.courseCategories[category] = (this.stats.courseCategories[category] || 0) + 1;
            }
        });

        // Invoice stats
        const invoiceRows = document.querySelectorAll('#invoices tbody tr');
        
        invoiceRows.forEach(row => {
            const total = parseFloat(row.dataset.total) || 0;
            const isPaid = row.dataset.paid === 'paid';
            
            if (isPaid) {
                this.stats.totalRevenue += total;
                this.stats.paidInvoiceCount++;
            } else {
                this.stats.totalUnpaidAmount += total;
                this.stats.unpaidInvoiceCount++;
            }
        });
    }

    renderStats() {
        const statsContainer = document.getElementById('stats-container');
        if (!statsContainer) return;

        // Get top course categories (top 3)
        const sortedCategories = Object.entries(this.stats.courseCategories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        const statsHTML = `
            <div class="stats-grid">
                <!-- Financial Stats -->
                <div class="stat-card stat-revenue">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">$${this.formatNumber(this.stats.totalRevenue)}</div>
                        <div class="stat-label">Total Revenue</div>
                    </div>
                </div>
                
                <div class="stat-card stat-unpaid">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-content">
                        <div class="stat-value">$${this.formatNumber(this.stats.totalUnpaidAmount)}</div>
                        <div class="stat-label">Unpaid Amount</div>
                        <div class="stat-sublabel">${this.stats.unpaidInvoiceCount} invoice${this.stats.unpaidInvoiceCount !== 1 ? 's' : ''}</div>
                    </div>
                </div>
                
                <!-- User Stats -->
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.userCount}</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                </div>
                
                <!-- Appointment Stats -->
                <div class="stat-card">
                    <div class="stat-icon">📅</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.appointmentCount}</div>
                        <div class="stat-label">Total Appointments</div>
                        <div class="stat-breakdown">
                            <span class="stat-item future">${this.stats.futureAppointments} upcoming</span>
                            <span class="stat-item completed">${this.stats.completedAppointments} completed</span>
                        </div>
                    </div>
                </div>
                
                <!-- Invoice Summary -->
                <div class="stat-card">
                    <div class="stat-icon">📄</div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.paidInvoiceCount + this.stats.unpaidInvoiceCount}</div>
                        <div class="stat-label">Total Invoices</div>
                        <div class="stat-breakdown">
                            <span class="stat-item paid">${this.stats.paidInvoiceCount} paid</span>
                            <span class="stat-item unpaid">${this.stats.unpaidInvoiceCount} unpaid</span>
                        </div>
                    </div>
                </div>
                
                <!-- Course Categories -->
                ${sortedCategories.length > 0 ? `
                <div class="stat-card stat-courses">
                    <div class="stat-icon">📚</div>
                    <div class="stat-content">
                        <div class="stat-label">Top Course Categories</div>
                        <div class="stat-categories">
                            ${sortedCategories.map(([category, count]) => `
                                <div class="category-item">
                                    <span class="category-name">${this.capitalizeFirst(category)}</span>
                                    <span class="category-count">${count}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        statsContainer.innerHTML = statsHTML;
    }

    formatNumber(num) {
        return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    refresh() {
        this.calculateStats();
        this.renderStats();
    }
}

// Initialize stats when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.statsManager = new StatsManager();
});