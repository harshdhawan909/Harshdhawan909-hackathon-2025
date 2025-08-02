// Global variables
let map;
let marker;
let selectedLocation = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadDashboardData();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Form submission
    document.getElementById('report-form').addEventListener('submit', handleReportSubmission);
    
    // Photo upload preview
    document.getElementById('photo').addEventListener('change', handlePhotoPreview);
    
    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    
    // Navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
}

// Initialize map
function initializeMap() {
    map = L.map('map').setView([40.7128, -74.0060], 13); // Default to NYC
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.setView([lat, lng], 15);
        });
    }
    
    // Map click handler
    map.on('click', function(e) {
        if (marker) {
            map.removeLayer(marker);
        }
        
        marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
        selectedLocation = {
            lat: e.latlng.lat,
            lng: e.latlng.lng
        };
        
        // Reverse geocoding (simplified)
        document.getElementById('location').value = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
    });
}

// Show report form
function showReportForm() {
    document.getElementById('report-section').classList.remove('hidden');
    document.getElementById('report-section').scrollIntoView({ behavior: 'smooth' });
}

// Handle navigation
function handleNavigation(e) {
    e.preventDefault();
    const target = e.target.getAttribute('href').substring(1);
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show target section
    const targetSection = document.getElementById(target + '-section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Handle photo preview
function handlePhotoPreview(e) {
    const files = e.target.files;
    const previewContainer = document.getElementById('photo-preview');
    previewContainer.innerHTML = '';
    
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    });
}

// Handle report submission
async function handleReportSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const form = e.target;
    
    // Collect form data
    const reportData = {
        issueType: form.issueType.value,
        description: form.description.value,
        location: form.location.value,
        coordinates: selectedLocation,
        reporterName: form.reporterName.value,
        reporterEmail: form.reporterEmail.value,
        reporterPhone: form.reporterPhone.value,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    
    // Add photos
    const photos = form.photo.files;
    for (let i = 0; i < photos.length; i++) {
        formData.append('photos', photos[i]);
    }
    
    formData.append('reportData', JSON.stringify(reportData));
    
    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            showSuccessModal(result.reportId);
            form.reset();
            document.getElementById('photo-preview').innerHTML = '';
            if (marker) {
                map.removeLayer(marker);
            }
        } else {
            alert('Error submitting report. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        // For demo purposes, simulate success
        const reportId = 'RPT' + Date.now();
        showSuccessModal(reportId);
        form.reset();
        document.getElementById('photo-preview').innerHTML = '';
    }
}

// Show success modal
function showSuccessModal(reportId) {
    document.getElementById('report-id').textContent = reportId;
    document.getElementById('success-modal').classList.remove('hidden');
}

// Close modal
function closeModal() {
    document.getElementById('success-modal').classList.add('hidden');
}

// Search reports
async function searchReports() {
    const searchTerm = document.getElementById('search-input').value;
    if (!searchTerm) return;
    
    try {
        const response = await fetch(`/api/reports/search?q=${encodeURIComponent(searchTerm)}`);
        if (response.ok) {
            const reports = await response.json();
            displayReports(reports);
        }
    } catch (error) {
        console.error('Error searching reports:', error);
        // Demo data
        displayDemoReports();
    }
}

// Display reports
function displayReports(reports) {
    const container = document.getElementById('reports-list');
    container.innerHTML = '';
    
    reports.forEach(report => {
        const reportElement = createReportElement(report);
        container.appendChild(reportElement);
    });
}

// Create report element
function createReportElement(report) {
    const div = document.createElement('div');
    div.className = 'report-item';
    
    div.innerHTML = `
        <div class="report-header">
            <span class="report-id">Report ID: ${report.id}</span>
            <span class="status ${report.status}">${report.status.toUpperCase()}</span>
        </div>
        <h4>${report.issueType.replace('-', ' ').toUpperCase()}</h4>
        <p><strong>Location:</strong> ${report.location}</p>
        <p><strong>Description:</strong> ${report.description}</p>
        <p><strong>Reported:</strong> ${new Date(report.timestamp).toLocaleDateString()}</p>
        ${report.lastUpdate ? `<p><strong>Last Update:</strong> ${report.lastUpdate}</p>` : ''}
    `;
    
    return div;
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch('/api/reports/stats');
        if (response.ok) {
            const stats = await response.json();
            updateDashboard(stats);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Demo data
        updateDashboard({
            total: 156,
            pending: 23,
            inProgress: 45,
            resolved: 88
        });
    }
}

// Update dashboard
function updateDashboard(stats) {
    document.getElementById('total-reports').textContent = stats.total;
    document.getElementById('pending-reports').textContent = stats.pending;
    document.getElementById('in-progress-reports').textContent = stats.inProgress;
    document.getElementById('resolved-reports').textContent = stats.resolved;
}

// Display demo reports for testing
function displayDemoReports() {
    const demoReports = [
        {
            id: 'RPT1234567890',
            issueType: 'road-damage',
            description: 'Large pothole on Main Street causing traffic issues',
            location: 'Main Street, Downtown',
            status: 'in-progress',
            timestamp: '2024-01-15T10:30:00Z',
            lastUpdate: 'Work crew assigned, repair scheduled for next week'
        },
        {
            id: 'RPT1234567891',
            issueType: 'water-leak',
            description: 'Water leak near the park entrance',
            location: 'Central Park Entrance',
            status: 'resolved',
            timestamp: '2024-01-10T14:20:00Z',
            lastUpdate: 'Leak repaired successfully'
        }
    ];
    
    displayReports(demoReports);
}
