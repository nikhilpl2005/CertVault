// ============================================
// API CONFIGURATION
// ============================================
const API_URL = '/api/certificates';

console.log('🌐 API URL:', API_URL);
console.log('🌐 Full URL will be:', window.location.origin + API_URL);

// ============================================
// STATE MANAGEMENT
// ============================================
let certificates = [];
let currentFile = null;
let currentFilter = 'all';
let currentPage = 'home';
let isProcessing = false;
let currentViewingCertId = null;
let certificateToDelete = null;

// ============================================
// DOM ELEMENTS
// ============================================
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadForm = document.getElementById('uploadForm');
const certificatesGrid = document.getElementById('certificatesGrid');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.querySelectorAll('.filter-tab');
const navLinks = document.querySelectorAll('.nav-link');
const submitBtn = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');

// ============================================
// INITIALIZE APP
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App initialized');
    loadCertificatesFromBackend();
    setupEventListeners();
    setupModalListeners();
    setupViewerListeners();
    setupDateInputs();
    navigateToPage('home');
});

// ============================================
// LOAD CERTIFICATES FROM BACKEND
// ============================================
async function loadCertificatesFromBackend() {
    try {
        console.log('📡 Fetching certificates from backend...');
        showLoadingOverlay();
        
        const response = await fetch(API_URL);
        const result = await response.json();
        
        if (result.success) {
            certificates = result.data;
            console.log(`✅ Loaded ${certificates.length} certificates`);
            renderCertificates();
        } else {
            console.error('❌ Failed to load certificates:', result.message);
            showToast('Failed to load certificates', 'error');
        }
    } catch (error) {
        console.error('❌ Error loading certificates:', error);
        showToast('Error connecting to server. Make sure backend is running!', 'error');
        certificates = [];
        renderCertificates();
    } finally {
        hideLoadingOverlay();
    }
}

// ============================================
// PAGE NAVIGATION
// ============================================
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

// ============================================
// EVENT LISTENERS SETUP
// ============================================
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

// ============================================
// MODAL LISTENERS
// ============================================
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

// ============================================
// VIEWER MODAL LISTENERS
// ============================================
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

// ============================================
// DATE INPUT VALIDATION
// ============================================
function setupDateInputs() {
    const monthInput = document.getElementById('certMonth');
    const dayInput = document.getElementById('certDay');
    const yearInput = document.getElementById('certYear');
    const dateError = document.getElementById('dateError');
    
    monthInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) value = value.slice(0, 2);
        if (value.length === 1) {
            if (parseInt(value) > 1) {
                value = '0' + value;
                dayInput.focus();
            }
        } else if (value.length === 2) {
            const month = parseInt(value);
            if (month > 12) {
                value = '12';
            } else if (month < 1) {
                value = '01';
            }
            dayInput.focus();
        }
        e.target.value = value;
        validateDate();
    });
    
    dayInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) value = value.slice(0, 2);
        if (value.length === 1) {
            if (parseInt(value) > 3) {
                value = '0' + value;
                yearInput.focus();
            }
        } else if (value.length === 2) {
            const day = parseInt(value);
            if (day > 31) {
                value = '31';
            } else if (day < 1) {
                value = '01';
            }
            yearInput.focus();
        }
        e.target.value = value;
        validateDate();
    });
    
    yearInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);
        e.target.value = value;
        validateDate();
    });
    
    function validateDate() {
        const month = parseInt(monthInput.value);
        const day = parseInt(dayInput.value);
        const year = parseInt(yearInput.value);
        
        if (monthInput.value && dayInput.value && yearInput.value) {
            const date = new Date(year, month - 1, day);
            const isValid = date.getFullYear() === year && 
                           date.getMonth() === month - 1 && 
                           date.getDate() === day;
            
            if (!isValid) {
                dateError.style.display = 'block';
                return false;
            } else {
                dateError.style.display = 'none';
                return true;
            }
        }
        dateError.style.display = 'none';
        return true;
    }
}

// ============================================
// FILE HANDLING
// ============================================
function handleFileSelect(file) {
    console.log('🔍 File selection started');
    
    if (!file) {
        console.log('❌ No file provided');
        return;
    }
    
    console.log('📄 File:', file.name, file.type, file.size);
    
    if (file.type !== 'application/pdf') {
        console.log('❌ Wrong file type');
        showToast('Please select a PDF file', 'error');
        return;
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        console.log('❌ File too large');
        showToast('File size must be less than 10MB', 'error');
        return;
    }
    
    console.log('✅ File validation passed');
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        console.log('✅ File read complete');
        
        currentFile = {
            name: file.name,
            data: e.target.result
        };
        
        console.log('✅ Current file set');
        
        // Safely update UI elements
        try {
            const fileName = document.getElementById('fileName');
            const fileIcon = document.getElementById('fileIcon');
            const uploadIcon = document.getElementById('uploadIcon');
            
            if (fileName) {
                fileName.textContent = file.name;
                console.log('✅ File name displayed');
            } else {
                console.warn('⚠️ fileName element not found');
            }
            
            if (fileIcon) {
                fileIcon.style.display = 'block';
                console.log('✅ File icon shown');
            } else {
                console.warn('⚠️ fileIcon element not found');
            }
            
            if (uploadIcon) {
                uploadIcon.style.display = 'none';
                console.log('✅ Upload icon hidden');
            } else {
                console.warn('⚠️ uploadIcon element not found');
            }
            
            if (uploadArea) {
                uploadArea.classList.add('file-selected');
                console.log('✅ Upload area updated');
            } else {
                console.warn('⚠️ uploadArea element not found');
            }
            
            showToast('File selected successfully!', 'success');
            console.log('✅ File selection complete');
            
        } catch (error) {
            console.error('❌ Error updating UI:', error);
        }
    };
    
    reader.onerror = (error) => {
        console.error('❌ Error reading file:', error);
        showToast('Error reading file', 'error');
    };
    
    reader.readAsDataURL(file);
}

// ============================================
// FORM SUBMISSION - UPLOAD TO BACKEND
// ============================================
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!currentFile) {
        showToast('Please select a PDF file', 'error');
        return;
    }
    
    if (isProcessing) return;
    
    // Validate date
    const monthInput = document.getElementById('certMonth');
    const dayInput = document.getElementById('certDay');
    const yearInput = document.getElementById('certYear');
    
    if (!monthInput.value || !dayInput.value || !yearInput.value) {
        showToast('Please enter a valid date', 'error');
        return;
    }
    
    // Prepare form data
    const formData = {
        name: document.getElementById('certName').value.trim(),
        issuer: document.getElementById('certIssuer').value.trim(),
        date: `${yearInput.value}-${String(monthInput.value).padStart(2, '0')}-${String(dayInput.value).padStart(2, '0')}`,
        category: document.getElementById('certCategory').value,
        notes: document.getElementById('certNotes').value.trim(),
        fileName: currentFile.name,
        fileData: currentFile.data
    };
    
    try {
        isProcessing = true;
        showLoadingOverlay();
        submitBtn.disabled = true;
        submitBtnText.textContent = 'Uploading...';
        
        console.log('📤 Uploading certificate to backend...');
        
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Certificate uploaded successfully');
            showToast('Certificate uploaded successfully!', 'success');
            await loadCertificatesFromBackend();
            navigateToPage('certificates');
            resetUploadForm();
        } else {
            console.error('❌ Upload failed:', result.message);
            showToast(result.message || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('❌ Upload error:', error);
        showToast('Failed to upload certificate. Make sure backend is running!', 'error');
    } finally {
        isProcessing = false;
        hideLoadingOverlay();
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Upload Certificate';
    }
}

// ============================================
// RESET UPLOAD FORM
// ============================================
function resetUploadForm() {
    if (uploadForm) {
        uploadForm.reset();
        currentFile = null;
        
        const fileName = document.getElementById('fileName');
        const fileIcon = document.getElementById('fileIcon');
        const uploadIcon = document.getElementById('uploadIcon');
        const dateError = document.getElementById('dateError');
        
        if (fileName) fileName.textContent = '';
        if (fileIcon) fileIcon.style.display = 'none';
        if (uploadIcon) uploadIcon.style.display = 'block';
        if (uploadArea) uploadArea.classList.remove('file-selected');
        if (dateError) dateError.style.display = 'none';
        if (fileInput) fileInput.value = '';
    }
}

// ============================================
// RENDER CERTIFICATES
// ============================================
function renderCertificates() {
    const filtered = getFilteredCertificates();
    
    if (filtered.length === 0) {
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
    
    certificatesGrid.innerHTML = filtered.map(cert => `
        <div class="certificate-card" onclick="viewCertificate('${cert.id}')">
            <div class="certificate-header">
                <div class="certificate-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="#B8956A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M8 12L11 15L16 9" stroke="#B8956A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="certificate-actions" onclick="event.stopPropagation()">
                    <button class="icon-btn" onclick="downloadCertificate('${cert.id}')" title="Download">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.5 12.5V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M5.83333 8.33333L10 12.5L14.1667 8.33333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M10 12.5V2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="icon-btn" onclick="deleteCertificate('${cert.id}')" title="Delete">
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

// ============================================
// FILTER CERTIFICATES
// ============================================
function getFilteredCertificates() {
    let filtered = certificates;
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(cert => cert.category === currentFilter);
    }
    
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

// ============================================
// VIEW CERTIFICATE
// ============================================
function viewCertificate(id) {
    try {
        const cert = certificates.find(c => c.id === id);
        if (!cert) {
            showToast('Certificate not found', 'error');
            return;
        }
        
        currentViewingCertId = id;
        document.getElementById('viewerTitle').textContent = cert.name;
        
        // Load PDF from Azure URL
        const pdfViewer = document.getElementById('pdfViewer');
        pdfViewer.src = cert.fileUrl;
        
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
    
    setTimeout(() => {
        document.getElementById('pdfViewer').src = '';
    }, 300);
}

// ============================================
// DOWNLOAD CERTIFICATE - FROM BACKEND
// ============================================
async function downloadCertificate(id) {
    try {
        console.log('⬇️ Downloading certificate:', id);
        showLoadingOverlay();
        
        const response = await fetch(`${API_URL}/download/${id}`);
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const cert = certificates.find(c => c.id === id);
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = cert ? cert.fileName : 'certificate.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        console.log('✅ Download complete');
        showToast('Certificate downloaded successfully!', 'success');
    } catch (error) {
        console.error('❌ Download error:', error);
        showToast('Failed to download certificate', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

// ============================================
// DELETE CERTIFICATE - FROM BACKEND
// ============================================
function deleteCertificate(id) {
    certificateToDelete = id;
    showDeleteModal();
}

async function confirmDelete() {
    if (certificateToDelete) {
        try {
            console.log('🗑️ Deleting certificate:', certificateToDelete);
            showLoadingOverlay();
            
            const response = await fetch(`${API_URL}/${certificateToDelete}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Certificate deleted');
                await loadCertificatesFromBackend();
                hideDeleteModal();
                showToast('Certificate deleted successfully!', 'success');
            } else {
                console.error('❌ Delete failed:', result.message);
                showToast(result.message || 'Delete failed', 'error');
            }
        } catch (error) {
            console.error('❌ Delete error:', error);
            showToast('Failed to delete certificate', 'error');
        } finally {
            hideLoadingOverlay();
        }
    }
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

// ============================================
// HELPER FUNCTIONS
// ============================================
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

function showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// ============================================
// MAKE FUNCTIONS GLOBALLY ACCESSIBLE
// ============================================
window.downloadCertificate = downloadCertificate;
window.deleteCertificate = deleteCertificate;
window.viewCertificate = viewCertificate;
window.navigateToPage = navigateToPage;
window.resetUploadForm = resetUploadForm;