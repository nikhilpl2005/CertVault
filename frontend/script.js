// Certificate Storage
let certificates = [];
let currentFile = null;
let currentFilter = 'all';
let currentPage = 'home';
let isProcessing = false;
let currentViewingCertId = null;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadForm = document.getElementById('uploadForm');
const certificatesGrid = document.getElementById('certificatesGrid');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.querySelectorAll('.filter-tab');
const navLinks = document.querySelectorAll('.nav-link');
const submitBtn = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCertificates();
    renderCertificates();
    setupEventListeners();
    setupModalListeners();
    setupViewerListeners();
    setupDateInputs();
    navigateToPage('home');
});

// Load certificates
function loadCertificates() {
    try {
        const stored = localStorage.getItem('certificates');
        if (stored) {
            certificates = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading certificates:', error);
        certificates = [];
        showToast('Error loading certificates. Starting fresh.', 'error');
    }
}

// Save certificates
function saveCertificates() {
    try {
        localStorage.setItem('certificates', JSON.stringify(certificates));
        return true;
    } catch (error) {
        console.error('Error saving certificates:', error);
        if (error.name === 'QuotaExceededError') {
            showToast('Storage limit exceeded. Please delete some certificates.', 'error');
        } else {
            showToast('Error saving certificate. Please try again.', 'error');
        }
        return false;
    }
}

// Page Navigation
function navigateToPage(page) {
    currentPage = page;
    
    // Hide all page sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show sections for the current page
    document.querySelectorAll(`[data-page="${page}"]`).forEach(section => {
        section.classList.add('active');
    });
    
    // Update active nav link
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${page}`) {
            link.classList.add('active');
        }
    });
    
    // Reset form if navigating to upload page
    if (page === 'upload') {
        resetUploadForm();
    }
    
    // Scroll to top
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Setup modal event listeners
function setupModalListeners() {
    document.getElementById('cancelDeleteBtn').addEventListener('click', hideDeleteModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    
    document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target.id === 'deleteModal') {
            hideDeleteModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('deleteModal').classList.contains('show')) {
                hideDeleteModal();
            }
            if (document.getElementById('viewerModal').classList.contains('show')) {
                hideViewerModal();
            }
        }
    });
}

// Setup viewer modal event listeners
function setupViewerListeners() {
    document.getElementById('viewerCloseBtn').addEventListener('click', hideViewerModal);
    document.getElementById('viewerDownloadBtn').addEventListener('click', () => {
        if (currentViewingCertId) {
            downloadCertificate(currentViewingCertId);
        }
    });
    document.getElementById('viewerDeleteBtn').addEventListener('click', () => {
        if (currentViewingCertId) {
            hideViewerModal();
            deleteCertificate(currentViewingCertId);
        }
    });
    
    document.getElementById('viewerModal').addEventListener('click', (e) => {
        if (e.target.id === 'viewerModal') {
            hideViewerModal();
        }
    });
}

// Event Listeners Setup
function setupEventListeners() {
    // Upload Area
    uploadArea.addEventListener('click', () => {
        if (!isProcessing) {
            fileInput.click();
        }
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!isProcessing) {
            uploadArea.classList.add('dragover');
        }
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (!isProcessing) {
            const file = e.dataTransfer.files[0];
            handleFileSelect(file);
        }
    });
    
    // File Input
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });
    
    // Upload Form
    uploadForm.addEventListener('submit', handleFormSubmit);
    
    // Search
    if (searchInput) {
        searchInput.addEventListener('input', filterCertificates);
    }
    
    // Filter Tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            filterCertificates();
        });
    });
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('href').substring(1);
            navigateToPage(target);
        });
    });
}

// Date Input Validation
function setupDateInputs() {
    const monthInput = document.getElementById('certMonth');
    const dayInput = document.getElementById('certDay');
    const yearInput = document.getElementById('certYear');
    const dateError = document.getElementById('dateError');
    
    // Restrict month input to 2 digits (1-12)
    monthInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) value = value.slice(0, 2);
        
        // Check if value is valid as we type
        if (value.length === 1) {
            // If first digit is > 1, prepend 0
            if (parseInt(value) > 1) {
                value = '0' + value;
            }
        } else if (value.length === 2) {
            const num = parseInt(value);
            if (num > 12) value = '12';
            if (num < 1) value = '01';
        }
        
        e.target.value = value;
        
        // Auto-focus to day input when month is complete
        if (value.length === 2) {
            dayInput.focus();
        }
    });
    
    // Prevent month from being 00
    monthInput.addEventListener('blur', (e) => {
        let value = e.target.value;
        if (value.length === 1) {
            value = '0' + value;
        }
        if (value === '00') {
            value = '01';
        }
        e.target.value = value;
    });
    
    // Restrict day input to 2 digits (1-31)
    dayInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) value = value.slice(0, 2);
        
        // Check if value is valid as we type
        if (value.length === 1) {
            // If first digit is > 3, prepend 0
            if (parseInt(value) > 3) {
                value = '0' + value;
            }
        } else if (value.length === 2) {
            const num = parseInt(value);
            if (num > 31) value = '31';
            if (num < 1) value = '01';
        }
        
        e.target.value = value;
        
        // Auto-focus to year input when day is complete
        if (value.length === 2) {
            yearInput.focus();
        }
    });
    
    // Prevent day from being 00
    dayInput.addEventListener('blur', (e) => {
        let value = e.target.value;
        if (value.length === 1) {
            value = '0' + value;
        }
        if (value === '00') {
            value = '01';
        }
        e.target.value = value;
    });
    
    // Restrict year input to 4 digits
    yearInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);
        e.target.value = value;
    });
    
    // Validate year on blur
    yearInput.addEventListener('blur', (e) => {
        const year = parseInt(e.target.value);
        if (year < 1900 || year > 2100) {
            dateError.style.display = 'block';
            yearInput.classList.add('error');
        } else {
            dateError.style.display = 'none';
            yearInput.classList.remove('error');
        }
    });
}

// Handle File Selection
function handleFileSelect(file) {
    if (!file) {
        showToast('No file selected', 'error');
        return;
    }
    
    // Validate file type
    if (file.type !== 'application/pdf') {
        showToast('Please upload a PDF file only', 'error');
        fileInput.value = '';
        return;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
        showToast('File size must be less than 10MB', 'error');
        fileInput.value = '';
        return;
    }
    
    // Store the file
    currentFile = file;
    
    // Show the form
    uploadForm.style.display = 'block';
    
    // Scroll to form
    uploadForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Show file preview
    showFilePreview(file);
    
    // Focus on the certificate name input
    setTimeout(() => {
        document.getElementById('certName').focus();
    }, 300);
}

// Show file preview
function showFilePreview(file) {
    const filePreview = document.getElementById('filePreview');
    const fileSize = (file.size / 1024).toFixed(2); // Convert to KB
    
    filePreview.innerHTML = `
        <div class="file-preview-content">
            <div class="file-preview-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#B8956A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M14 2V8H20" stroke="#B8956A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div class="file-preview-info">
                <div class="file-preview-name">${file.name}</div>
                <div class="file-preview-size">${fileSize} KB</div>
            </div>
            <button type="button" class="file-preview-remove" onclick="resetUploadForm()">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
    `;
}

// Reset upload form
function resetUploadForm() {
    currentFile = null;
    fileInput.value = '';
    uploadForm.style.display = 'none';
    uploadForm.reset();
    document.getElementById('filePreview').innerHTML = '';
    document.getElementById('dateError').style.display = 'none';
    document.getElementById('certYear').classList.remove('error');
}

// Handle Form Submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (isProcessing) {
        return;
    }
    
    if (!currentFile) {
        showToast('Please select a file first', 'error');
        return;
    }
    
    // Get form values
    const name = document.getElementById('certName').value.trim();
    const category = document.getElementById('certCategory').value;
    const issuer = document.getElementById('certIssuer').value.trim();
    const month = document.getElementById('certMonth').value.padStart(2, '0');
    const day = document.getElementById('certDay').value.padStart(2, '0');
    const year = document.getElementById('certYear').value;
    const notes = document.getElementById('certNotes').value.trim();
    
    // Validate all fields
    if (!name || !category || !issuer || !month || !day || !year) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate year
    const yearNum = parseInt(year);
    if (yearNum < 1900 || yearNum > 2100) {
        showToast('Please enter a valid year (1900-2100)', 'error');
        document.getElementById('dateError').style.display = 'block';
        document.getElementById('certYear').classList.add('error');
        return;
    }
    
    // Validate date
    const dateString = `${year}-${month}-${day}`;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        showToast('Please enter a valid date', 'error');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Convert file to base64 with better error handling
        const fileData = await readFileAsDataURL(currentFile);
        
        // Create certificate object
        const certificate = {
            id: Date.now(),
            name: name,
            fileName: currentFile.name,
            category: category,
            issuer: issuer,
            date: dateString,
            notes: notes,
            fileData: fileData,
            uploadDate: new Date().toISOString()
        };
        
        // Add to certificates array
        certificates.unshift(certificate);
        
        // Save to localStorage
        const saved = saveCertificates();
        
        if (!saved) {
            // Remove the certificate if save failed
            certificates.shift();
            setLoadingState(false);
            return;
        }
        
        // Success!
        showToast('Certificate uploaded successfully!', 'success');
        renderCertificates();
        resetUploadForm();
        
        // Navigate to certificates page after a short delay
        setTimeout(() => {
            navigateToPage('certificates');
        }, 1500);
        
    } catch (error) {
        console.error('Error uploading certificate:', error);
        showToast('Failed to upload certificate. Please try again.', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Read file as data URL with Promise for better error handling
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        // Set timeout to prevent hanging
        const timeout = setTimeout(() => {
            reader.abort();
            reject(new Error('File reading timeout'));
        }, 30000); // 30 seconds timeout
        
        reader.onload = (e) => {
            clearTimeout(timeout);
            resolve(e.target.result);
        };
        
        reader.onerror = (e) => {
            clearTimeout(timeout);
            reject(new Error('Failed to read file'));
        };
        
        reader.onabort = (e) => {
            clearTimeout(timeout);
            reject(new Error('File reading was aborted'));
        };
        
        try {
            reader.readAsDataURL(file);
        } catch (error) {
            clearTimeout(timeout);
            reject(error);
        }
    });
}

// Set loading state
function setLoadingState(loading) {
    isProcessing = loading;
    
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'not-allowed';
        submitBtnText.textContent = 'Processing...';
        
        // Show loading overlay
        document.getElementById('loadingOverlay').style.display = 'flex';
    } else {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtnText.textContent = 'Save Certificate';
        
        // Hide loading overlay
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// Render Certificates
function renderCertificates() {
    if (!certificatesGrid) return;
    
    if (certificates.length === 0) {
        certificatesGrid.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50.6667 8H13.3333C10.3878 8 8 10.3878 8 13.3333V50.6667C8 53.6122 10.3878 56 13.3333 56H50.6667C53.6122 56 56 53.6122 56 50.6667V13.3333C56 10.3878 53.6122 8 50.6667 8Z" stroke="#E5E7EB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M21.3333 32L29.3333 40L42.6667 24" stroke="#E5E7EB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <h3>No certificates yet</h3>
                <p>Upload your first certificate to get started</p>
                <button class="btn btn-primary" onclick="navigateToPage('upload')">Upload Certificate</button>
            </div>
        `;
        return;
    }
    
    const filteredCerts = getFilteredCertificates();
    
    if (filteredCerts.length === 0) {
        certificatesGrid.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32 56C45.2548 56 56 45.2548 56 32C56 18.7452 45.2548 8 32 8C18.7452 8 8 18.7452 8 32C8 45.2548 18.7452 56 32 56Z" stroke="#E5E7EB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M32 21.3333V32" stroke="#E5E7EB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M32 42.6667H32.02" stroke="#E5E7EB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <h3>No certificates found</h3>
                <p>Try adjusting your search or filter</p>
            </div>
        `;
        return;
    }
    
    certificatesGrid.innerHTML = filteredCerts.map((cert, index) => `
        <div class="certificate-card" style="animation-delay: ${index * 0.1}s" onclick="viewCertificate(${cert.id})">
            <div class="certificate-header">
                <div class="certificate-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#B8956A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14 2V8H20" stroke="#B8956A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16 13H8" stroke="#B8956A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16 17H8" stroke="#B8956A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="certificate-actions" onclick="event.stopPropagation()">
                    <button class="icon-btn" onclick="downloadCertificate(${cert.id})" title="Download">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.5 12.5V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M5.83333 8.33333L10 12.5L14.1667 8.33333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M10 12.5V2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="icon-btn" onclick="deleteCertificate(${cert.id})" title="Delete">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.5 5H4.16667H17.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M6.66667 5V3.33333C6.66667 2.89131 6.84226 2.46738 7.15482 2.15482C7.46738 1.84226 7.89131 1.66667 8.33333 1.66667H11.6667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5M15.8333 5V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83333C5.39131 18.3333 4.96738 18.1577 4.65482 17.8452C4.34226 17.5326 4.16667 17.1087 4.16667 16.6667V5H15.8333Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <h3 class="certificate-name" title="${cert.name}">${cert.name}</h3>
            <div class="certificate-info">
                <div class="certificate-info-item" title="${formatDate(cert.date)}">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline; vertical-align: middle; margin-right: 6px;">
                        <path d="M11.6667 2.33333H2.33333C1.59695 2.33333 1 2.93029 1 3.66667V11.6667C1 12.403 1.59695 13 2.33333 13H11.6667C12.403 13 13 12.403 13 11.6667V3.66667C13 2.93029 12.403 2.33333 11.6667 2.33333Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M1 5.66667H13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9.33333 1V3.66667" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M4.66667 1V3.66667" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${formatDate(cert.date)}
                </div>
                <div class="certificate-info-item" title="${cert.issuer}">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline; vertical-align: middle; margin-right: 6px;">
                        <path d="M7 12.8333C10.2217 12.8333 12.8333 10.2217 12.8333 7C12.8333 3.77834 10.2217 1.16667 7 1.16667C3.77834 1.16667 1.16667 3.77834 1.16667 7C1.16667 10.2217 3.77834 12.8333 7 12.8333Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M7 3.5V7L9.33333 8.16667" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${cert.issuer}
                </div>
            </div>
            <span class="certificate-category">${getCategoryName(cert.category)}</span>
            ${cert.notes ? `<div class="certificate-footer"><div class="certificate-date" title="${cert.notes}">${cert.notes}</div></div>` : ''}
        </div>
    `).join('');
}

// Filter Certificates
function getFilteredCertificates() {
    let filtered = certificates;
    
    // Filter by category
    if (currentFilter !== 'all') {
        filtered = filtered.filter(cert => cert.category === currentFilter);
    }
    
    // Filter by search
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    if (searchTerm) {
        filtered = filtered.filter(cert => 
            cert.name.toLowerCase().includes(searchTerm) ||
            cert.issuer.toLowerCase().includes(searchTerm) ||
            (cert.notes && cert.notes.toLowerCase().includes(searchTerm))
        );
    }
    
    return filtered;
}

function filterCertificates() {
    renderCertificates();
}

// View Certificate
function viewCertificate(id) {
    try {
        const cert = certificates.find(c => c.id === id);
        if (!cert) {
            showToast('Certificate not found', 'error');
            return;
        }
        
        currentViewingCertId = id;
        
        // Set title
        document.getElementById('viewerTitle').textContent = cert.name;
        
        // Set PDF in iframe
        const pdfViewer = document.getElementById('pdfViewer');
        pdfViewer.src = cert.fileData;
        
        // Show modal
        showViewerModal();
    } catch (error) {
        console.error('Error viewing certificate:', error);
        showToast('Failed to open certificate', 'error');
    }
}

function showViewerModal() {
    const modal = document.getElementById('viewerModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideViewerModal() {
    const modal = document.getElementById('viewerModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    currentViewingCertId = null;
    
    // Clear iframe
    setTimeout(() => {
        document.getElementById('pdfViewer').src = '';
    }, 300);
}

// Download Certificate
function downloadCertificate(id) {
    try {
        const cert = certificates.find(c => c.id === id);
        if (!cert) {
            showToast('Certificate not found', 'error');
            return;
        }
        
        // Create download link
        const link = document.createElement('a');
        link.href = cert.fileData;
        link.download = cert.fileName;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Certificate downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error downloading certificate:', error);
        showToast('Failed to download certificate', 'error');
    }
}

// Delete Certificate
let certificateToDelete = null;

function deleteCertificate(id) {
    certificateToDelete = id;
    showDeleteModal();
}

function showDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    certificateToDelete = null;
}

function confirmDelete() {
    if (certificateToDelete) {
        try {
            certificates = certificates.filter(c => c.id !== certificateToDelete);
            saveCertificates();
            renderCertificates();
            hideDeleteModal();
            showToast('Certificate deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting certificate:', error);
            showToast('Failed to delete certificate', 'error');
        }
    }
}

// Helper Functions
function formatDate(dateString) {
    try {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (error) {
        return dateString;
    }
}

function getCategoryName(category) {
    const names = {
        'degree': 'Degree Certificate',
        'course': 'Course Completion',
        'achievement': 'Achievement',
        'professional': 'Professional',
        'other': 'Other'
    };
    return names[category] || category;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Make functions globally accessible
window.downloadCertificate = downloadCertificate;
window.deleteCertificate = deleteCertificate;
window.viewCertificate = viewCertificate;
window.navigateToPage = navigateToPage;
window.resetUploadForm = resetUploadForm;
