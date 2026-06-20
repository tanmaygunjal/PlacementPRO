const API_URL = '/api';

// Global SPA State
let token = localStorage.getItem('token') || null;
let currentUser = null;
let currentProfile = null;
let currentTab = 'jobs-panel';

// Resume Builder State Arrays
let educationList = [];
let experienceList = [];
let projectsList = [];

// UI Elements
const toastContainer = document.getElementById('toast-container');
const authModalOverlay = document.getElementById('auth-modal-overlay');
const loginModalContent = document.getElementById('login-modal-content');
const registerModalContent = document.getElementById('register-modal-content');
const atsModalContent = document.getElementById('ats-modal-content');
const navbarLinks = document.getElementById('navbar-links');
const authButtonsContainer = document.getElementById('auth-buttons-container');
const userInfoContainer = document.getElementById('user-info-container');
const userEmailDisplay = document.getElementById('user-email-display');
const userRoleBadge = document.getElementById('user-role-badge');

// Tab links
const lnkJobs = document.getElementById('lnk-jobs');
const lnkResumeBuilder = document.getElementById('lnk-resume-builder');
const lnkStudentProfile = document.getElementById('lnk-student-profile');
const lnkRecruiter = document.getElementById('lnk-recruiter');

// Setup Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupNavigation();
    setupAuthUI();
    setupForms();
    setupResumeBuilderEvents();
});

// Toast Helper
function showToast(message, type = 'success') {
    toastContainer.innerText = message;
    toastContainer.className = `toast show toast-${type}`;
    setTimeout(() => {
        toastContainer.classList.remove('show');
    }, 4000);
}

// Initialize Application
async function initApp() {
    if (token) {
        const success = await fetchCurrentUser();
        if (!success) {
            logout();
        }
    }
    renderNavigation();
    loadJobs();
}

// Fetch Logged In User
async function fetchCurrentUser() {
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) return false;
        
        currentUser = await res.json();
        if (currentUser.role === 'student' && currentUser.student_profile) {
            currentProfile = currentUser.student_profile;
        }
        return true;
    } catch (err) {
        console.error("Auth error:", err);
        return false;
    }
}

// Navigation & Tab Switching
function setupNavigation() {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-target');
            switchTab(target);
        });
    });

    document.getElementById('nav-logo').addEventListener('click', () => {
        switchTab('jobs-panel');
    });
}

function switchTab(tabId) {
    currentTab = tabId;
    
    // Toggle active link class
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        if (link.getAttribute('data-target') === tabId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Toggle active panel class
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => {
        if (panel.id === tabId) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    // Load data specific to tabs
    if (tabId === 'jobs-panel') {
        loadJobs();
    } else if (tabId === 'student-profile-panel') {
        loadStudentProfile();
        loadStudentApplications();
        loadReadinessDashboard();
    } else if (tabId === 'resume-builder-panel') {
        loadResumeBuilder();
    } else if (tabId === 'recruiter-panel') {
        loadRecruiterDashboard();
    }
}

// Render Header based on login state
function renderNavigation() {
    if (currentUser) {
        authButtonsContainer.style.display = 'none';
        userInfoContainer.style.display = 'flex';
        userEmailDisplay.innerText = currentUser.email;
        userRoleBadge.innerText = currentUser.role;
        navbarLinks.style.display = 'flex';

        if (currentUser.role === 'student') {
            lnkStudentProfile.style.display = 'block';
            lnkResumeBuilder.style.display = 'block';
            lnkRecruiter.style.display = 'none';
        } else if (currentUser.role === 'recruiter' || currentUser.role === 'admin') {
            lnkStudentProfile.style.display = 'none';
            lnkResumeBuilder.style.display = 'none';
            lnkRecruiter.style.display = 'block';
        }
    } else {
        authButtonsContainer.style.display = 'flex';
        userInfoContainer.style.display = 'none';
        navbarLinks.style.display = 'none';
        lnkStudentProfile.style.display = 'none';
        lnkResumeBuilder.style.display = 'none';
        lnkRecruiter.style.display = 'none';
        switchTab('jobs-panel');
    }
}

// Auth UI Modals Handling
function setupAuthUI() {
    const btnShowLogin = document.getElementById('btn-show-login');
    const btnShowRegister = document.getElementById('btn-show-register');
    const btnCloseLogin = document.getElementById('btn-close-login');
    const btnCloseRegister = document.getElementById('btn-close-register');
    const btnCloseAts = document.getElementById('btn-close-ats');
    const lnkSwitchRegister = document.getElementById('lnk-switch-register');
    const lnkSwitchLogin = document.getElementById('lnk-switch-login');
    const btnLogout = document.getElementById('btn-logout');

    const openModal = (type) => {
        authModalOverlay.classList.add('open');
        if (type === 'login') {
            loginModalContent.style.display = 'block';
            registerModalContent.style.display = 'none';
            atsModalContent.style.display = 'none';
        } else if (type === 'register') {
            loginModalContent.style.display = 'none';
            registerModalContent.style.display = 'block';
            atsModalContent.style.display = 'none';
        } else if (type === 'ats') {
            loginModalContent.style.display = 'none';
            registerModalContent.style.display = 'none';
            atsModalContent.style.display = 'block';
        }
    };

    const closeModal = () => {
        authModalOverlay.classList.remove('open');
        loginModalContent.style.display = 'none';
        registerModalContent.style.display = 'none';
        atsModalContent.style.display = 'none';
    };

    btnShowLogin.addEventListener('click', () => openModal('login'));
    btnShowRegister.addEventListener('click', () => openModal('register'));
    btnCloseLogin.addEventListener('click', closeModal);
    btnCloseRegister.addEventListener('click', closeModal);
    btnCloseAts.addEventListener('click', closeModal);
    lnkSwitchRegister.addEventListener('click', (e) => { e.preventDefault(); openModal('register'); });
    lnkSwitchLogin.addEventListener('click', (e) => { e.preventDefault(); openModal('login'); });
    
    // Close on overlay click
    authModalOverlay.addEventListener('click', (e) => {
        if (e.target === authModalOverlay) closeModal();
    });

    btnLogout.addEventListener('click', logout);
}

// Logout Action
function logout() {
    token = null;
    currentUser = null;
    currentProfile = null;
    localStorage.removeItem('token');
    showToast("Logged out successfully");
    renderNavigation();
}

// API error helper
async function parseError(response) {
    try {
        const data = await response.json();
        return data.detail || "Something went wrong";
    } catch (err) {
        return `Error: ${response.statusText}`;
    }
}

// Setup Submissions
function setupForms() {
    // Login Form Submit
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_URL}/auth/login-json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const errMsg = await parseError(res);
                showToast(errMsg, 'error');
                return;
            }

            const data = await res.json();
            token = data.access_token;
            localStorage.setItem('token', token);
            
            authModalOverlay.classList.remove('open');
            showToast("Successfully logged in");
            await initApp();
        } catch (err) {
            showToast("Network connection failed", 'error');
        }
    });

    // Register Form Submit
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const role = document.getElementById('register-role').value;

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });

            if (!res.ok) {
                const errMsg = await parseError(res);
                showToast(errMsg, 'error');
                return;
            }

            showToast("Registration successful! Logging in...", 'success');
            
            // Auto login after register
            const loginRes = await fetch(`${API_URL}/auth/login-json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const loginData = await loginRes.json();
            token = loginData.access_token;
            localStorage.setItem('token', token);
            
            authModalOverlay.classList.remove('open');
            await initApp();
        } catch (err) {
            showToast("Network connection failed", 'error');
        }
    });

    // Student Profile Submit
    document.getElementById('student-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const profileData = {
            full_name: document.getElementById('profile-name').value,
            roll_number: document.getElementById('profile-roll').value,
            branch: document.getElementById('profile-branch').value,
            cgpa: parseFloat(document.getElementById('profile-cgpa').value),
            graduation_year: parseInt(document.getElementById('profile-year').value),
            skills: document.getElementById('profile-skills').value
        };

        const method = currentProfile ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(`${API_URL}/students/profile`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            if (!res.ok) {
                const errMsg = await parseError(res);
                showToast(errMsg, 'error');
                return;
            }

            currentProfile = await res.json();
            showToast("Profile saved successfully");
            loadStudentProfile(); // Redraw profile UI
            loadReadinessDashboard(); // Redraw dashboard
        } catch (err) {
            showToast("Failed to save profile", 'error');
        }
    });

    // Resume Dropzone & File Click Upload
    const dropzone = document.getElementById('resume-dropzone');
    const fileInput = document.getElementById('resume-file-input');

    dropzone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            uploadResumeFile(fileInput.files[0]);
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            uploadResumeFile(e.dataTransfer.files[0]);
        }
    });

    // Recruiter: Create Company Form Submit
    document.getElementById('recruiter-company-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const companyData = {
            name: document.getElementById('company-name').value,
            description: document.getElementById('company-desc').value,
            website: document.getElementById('company-web').value
        };

        try {
            const res = await fetch(`${API_URL}/jobs/companies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(companyData)
            });

            if (!res.ok) {
                const errMsg = await parseError(res);
                showToast(errMsg, 'error');
                return;
            }

            showToast("Company registered successfully");
            document.getElementById('recruiter-company-form').reset();
            loadRecruiterDashboard(); // reload company dropdown list
        } catch (err) {
            showToast("Failed to register company", 'error');
        }
    });

    // Recruiter: Post Job Form Submit
    document.getElementById('recruiter-job-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const jobData = {
            company_id: parseInt(document.getElementById('job-company-select').value),
            title: document.getElementById('job-title').value,
            description: document.getElementById('job-description').value,
            requirements: document.getElementById('job-requirements').value,
            location: document.getElementById('job-location').value,
            ctc: parseFloat(document.getElementById('job-ctc').value),
            eligibility_cgpa: parseFloat(document.getElementById('job-eligibility').value),
            deadline: new Date(document.getElementById('job-deadline').value).toISOString()
        };

        try {
            const res = await fetch(`${API_URL}/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(jobData)
            });

            if (!res.ok) {
                const errMsg = await parseError(res);
                showToast(errMsg, 'error');
                return;
            }

            showToast("Job published successfully");
            document.getElementById('recruiter-job-form').reset();
            switchSubTab('recruiter-applicants-tab');
            loadRecruiterDashboard(); // reload job dropdowns
        } catch (err) {
            showToast("Failed to publish job", 'error');
        }
    });

    // Recruiter Sub-Tabs Selection
    const subTabBtns = document.querySelectorAll('.tab-sub-btn');
    subTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const subTarget = e.target.getAttribute('data-sub');
            switchSubTab(subTarget);
        });
    });

    // Filters Submit
    document.getElementById('btn-apply-filters').addEventListener('click', () => {
        loadJobs();
    });
}

function switchSubTab(subPanelId) {
    const subButtons = document.querySelectorAll('.tab-sub-btn');
    subButtons.forEach(btn => {
        if (btn.getAttribute('data-sub') === subPanelId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const subPanels = document.querySelectorAll('.sub-panel');
    subPanels.forEach(panel => {
        if (panel.id === subPanelId) {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    });
}

// Resume Upload Helper
async function uploadResumeFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const statusText = document.getElementById('resume-status-text');
    statusText.innerText = `Uploading ${file.name}...`;

    try {
        const res = await fetch(`${API_URL}/students/resume`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) {
            const errMsg = await parseError(res);
            showToast(errMsg, 'error');
            statusText.innerText = "Upload failed. Click or drag to retry.";
            return;
        }

        currentProfile = await res.json();
        showToast("Resume uploaded successfully");
        loadStudentProfile();
        loadReadinessDashboard();
    } catch (err) {
        showToast("Network error uploading resume", 'error');
        statusText.innerText = "Upload failed. Click or drag to retry.";
    }
}

// Load Jobs Board listings
async function loadJobs() {
    const container = document.getElementById('jobs-cards-container');
    container.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">Loading jobs...</p>`;

    const search = document.getElementById('filter-search').value;
    const branch = document.getElementById('filter-branch').value;
    const maxCgpa = document.getElementById('filter-max-cgpa').value;

    let queryParams = '?active_only=true';
    if (search) queryParams += `&search=${encodeURIComponent(search)}`;
    if (maxCgpa) queryParams += `&max_cgpa=${maxCgpa}`;

    let headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(`${API_URL}/jobs${queryParams}`, { headers });
        if (!res.ok) {
            container.innerHTML = `<p style="color: var(--danger); text-align: center;">Could not load job posts.</p>`;
            return;
        }

        const jobs = await res.json();
        
        // Client-side branch filter
        const filteredJobs = branch 
            ? jobs.filter(j => !j.requirements || j.requirements.toLowerCase().includes(branch.toLowerCase()))
            : jobs;

        if (filteredJobs.length === 0) {
            container.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">No job listings match your criteria.</p>`;
            return;
        }

        let studentApplications = [];
        if (token && currentUser && currentUser.role === 'student') {
            const appRes = await fetch(`${API_URL}/applications/my`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (appRes.ok) {
                studentApplications = await appRes.json();
            }
        }

        container.innerHTML = '';
        filteredJobs.forEach(job => {
            const deadlineDate = new Date(job.deadline).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });

            const appliedApp = studentApplications.find(app => app.job_id === job.id);
            let actionBtnHtml = '';
            
            if (!currentUser) {
                actionBtnHtml = `<button class="btn btn-secondary" onclick="document.getElementById('btn-show-login').click()">Log in to Apply</button>`;
            } else if (currentUser.role === 'student') {
                if (appliedApp) {
                    actionBtnHtml = `<span class="status-badge status-${appliedApp.status}">${appliedApp.status}</span>`;
                } else {
                    const isEligible = !currentProfile || currentProfile.cgpa >= job.eligibility_cgpa;
                    
                    if (isEligible) {
                        actionBtnHtml = `<button class="btn btn-primary" onclick="applyToJob(${job.id}, '${job.title}')">Apply Now</button>`;
                    } else {
                        actionBtnHtml = `<button class="btn btn-secondary" disabled style="opacity: 0.5;">Ineligible (CGPA < ${job.eligibility_cgpa})</button>`;
                    }
                }
            }

            const ctcText = job.ctc ? `${job.ctc} LPA` : "Not specified";
            const reqText = job.requirements || "None";
            const locationText = job.location || "Office";

            const card = document.createElement('article');
            card.className = 'card job-card';
            card.innerHTML = `
                <div class="job-header">
                    <div>
                        <div class="job-company">${job.company.name}</div>
                        <h3 class="card-title" style="margin-bottom: 4px;">${job.title}</h3>
                        <p style="color: var(--text-secondary); font-size: 13px;">📍 ${locationText}</p>
                    </div>
                    <div class="job-meta-pills">
                        <span class="pill pill-ctc">💰 ${ctcText}</span>
                        <span class="pill pill-eligibility">🎓 Min CGPA: ${job.eligibility_cgpa}</span>
                    </div>
                </div>
                <p style="font-size: 14px; color: var(--text-secondary);">${job.description}</p>
                <div style="font-size: 13px; color: var(--text-secondary);">
                    <strong>Required Skills:</strong> <span style="color: var(--text-primary);">${reqText}</span>
                </div>
                <div class="job-footer">
                    <span class="job-deadline">⏳ Deadline: ${deadlineDate}</span>
                    ${actionBtnHtml}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<p style="color: var(--danger); text-align: center;">Network connection error loading jobs.</p>`;
    }
}

// Student Apply Trigger
async function applyToJob(jobId, jobTitle) {
    if (!token) return;
    
    // Check profile exists
    if (!currentProfile) {
        showToast("Please complete your profile details first!", "error");
        switchTab('student-profile-panel');
        return;
    }

    if (!currentProfile.resume_filename) {
        showToast("Please upload a PDF resume before applying!", "error");
        switchTab('student-profile-panel');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/applications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ job_id: jobId })
        });

        if (!res.ok) {
            const errMsg = await parseError(res);
            showToast(errMsg, 'error');
            return;
        }

        showToast(`Applied successfully to ${jobTitle}!`);
        loadJobs();
    } catch (err) {
        showToast("Failed to submit application", 'error');
    }
}

// Load Student Profile inputs
function loadStudentProfile() {
    if (!currentUser) return;
    
    document.getElementById('resume-upload-card').style.display = 'block';

    if (currentProfile) {
        document.getElementById('profile-name').value = currentProfile.full_name || '';
        document.getElementById('profile-roll').value = currentProfile.roll_number || '';
        document.getElementById('profile-branch').value = currentProfile.branch || '';
        document.getElementById('profile-cgpa').value = currentProfile.cgpa || '';
        document.getElementById('profile-year').value = currentProfile.graduation_year || '';
        document.getElementById('profile-skills').value = currentProfile.skills || '';
        
        document.getElementById('btn-save-profile').innerText = "Update Profile";

        if (currentProfile.resume_filename) {
            document.getElementById('resume-status-text').innerHTML = `<strong>Resume Loaded:</strong> ${currentProfile.resume_filename} <br><span style="font-size: 12px; color: var(--success);">Drop a new file to replace</span>`;
            document.getElementById('resume-download-container').style.display = 'block';
            document.getElementById('btn-download-resume').href = `${API_URL}/students/${currentProfile.id}/resume`;
            document.getElementById('btn-download-resume').setAttribute("download", `${currentProfile.full_name}_resume`);
        } else {
            document.getElementById('resume-status-text').innerText = "Click or drag PDF resume here to upload";
            document.getElementById('resume-download-container').style.display = 'none';
        }
    } else {
        document.getElementById('student-profile-form').reset();
        document.getElementById('btn-save-profile').innerText = "Create Profile";
        document.getElementById('resume-status-text').innerText = "Complete your profile first before uploading a resume";
        document.getElementById('resume-download-container').style.display = 'none';
    }
}

// Load Student application tables
async function loadStudentApplications() {
    const tbody = document.getElementById('student-applications-table-body');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">Loading applications...</td></tr>`;

    try {
        const res = await fetch(`${API_URL}/applications/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger);">Error loading application records.</td></tr>`;
            return;
        }

        const apps = await res.json();
        if (apps.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No applications found. Apply to jobs in the board!</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        apps.forEach(app => {
            const date = new Date(app.applied_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight: 600;">${app.job.title}</td>
                <td>${app.job.company.name}</td>
                <td>${date}</td>
                <td><span class="status-badge status-${app.status}">${app.status}</span></td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger);">Network connection issue.</td></tr>`;
    }
}

// SMART PLACEMENT DASHBOARD DATA LOADER
async function loadReadinessDashboard() {
    if (!token || currentUser.role !== 'student') return;

    try {
        const res = await fetch(`${API_URL}/students/readiness`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) return;

        const data = await res.json();
        
        // 1. Placement Readiness Score
        const scoreVal = document.getElementById('dashboard-score-value');
        const scoreBar = document.getElementById('dashboard-score-bar');
        scoreVal.innerText = `${data.readiness_score}%`;
        scoreBar.style.width = `${data.readiness_score}%`;

        // 2. Core Skills matched vs missing
        const skillsList = document.getElementById('dashboard-skills-list');
        skillsList.innerHTML = '';

        const matchedSkills = currentProfile && currentProfile.skills 
            ? currentProfile.skills.split(',').map(s => s.trim().toLowerCase()) 
            : [];

        const coreSkills = ["SQL", "DBMS", "Aptitude", "Python", "Data Structures", "Algorithms"];
        coreSkills.forEach(s => {
            const isMatched = matchedSkills.includes(s.toLowerCase());
            const badge = document.createElement('span');
            badge.className = `skill-tag ${isMatched ? 'skill-matched' : 'skill-missing'}`;
            badge.innerHTML = isMatched ? `✓ ${s}` : `✗ ${s}`;
            skillsList.appendChild(badge);
        });

        // 3. Upcoming deadlines list
        const deadlinesList = document.getElementById('dashboard-deadlines-list');
        deadlinesList.innerHTML = '';
        if (data.upcoming_deadlines.length === 0) {
            deadlinesList.innerHTML = `<li style="color: var(--text-secondary);">No upcoming job deadlines (7d)</li>`;
        } else {
            data.upcoming_deadlines.forEach(job => {
                const li = document.createElement('li');
                const cleanDate = new Date(job.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                li.innerHTML = `⚠️ <span style="font-weight:600;">${job.company_name}</span> - ${job.title} <span style="color:var(--danger); font-size:11px;">(Exp: ${cleanDate})</span>`;
                deadlinesList.appendChild(li);
            });
        }

        // 4. Status levels
        document.getElementById('dashboard-interview-readiness').innerText = data.interview_readiness;
        
        const badgeColors = {
            "Low": "var(--danger)",
            "Moderate": "var(--warning)",
            "High": "var(--success)"
        };
        document.getElementById('dashboard-interview-readiness').style.color = badgeColors[data.interview_readiness];

        const resumeBadge = document.getElementById('dashboard-resume-status');
        if (data.resume_uploaded) {
            resumeBadge.innerText = "Resume Uploaded";
            resumeBadge.className = "status-badge status-offered";
        } else {
            resumeBadge.innerText = "No Resume Uploaded";
            resumeBadge.className = "status-badge status-rejected";
        }

    } catch (err) {
        console.error("Dashboard calculation issue:", err);
    }
}

// RESUME BUILDER LOGICS
function setupResumeBuilderEvents() {
    document.getElementById('btn-add-edu').addEventListener('click', () => {
        addEducationBlock("", "", "", "");
    });
    
    document.getElementById('btn-add-exp').addEventListener('click', () => {
        addExperienceBlock("", "", "", "");
    });
    
    document.getElementById('btn-add-proj').addEventListener('click', () => {
        addProjectBlock("", "", "");
    });

    // Save Resume Submit
    document.getElementById('resume-builder-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveResumeBuilderData();
    });

    // ATS Check click
    document.getElementById('btn-ats-check').addEventListener('click', triggerAtsEvaluation);

    // Print A4 trigger
    document.getElementById('btn-print-resume').addEventListener('click', () => {
        window.print();
    });

    // Template style select listener to auto update preview
    document.getElementById('resume-template-select').addEventListener('change', () => {
        updateResumePreview();
    });
}

function addEducationBlock(school = "", degree = "", year = "", cgpa = "") {
    const container = document.getElementById('builder-education-container');
    const block = document.createElement('div');
    block.className = 'builder-entry';
    block.innerHTML = `
        <button type="button" class="builder-remove">&times;</button>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group" style="margin-bottom:8px;">
                <label>Institution / School</label>
                <input type="text" class="form-control edu-school" value="${school}" required>
            </div>
            <div class="form-group" style="margin-bottom:8px;">
                <label>Degree / Class</label>
                <input type="text" class="form-control edu-degree" value="${degree}" placeholder="e.g. B.Tech" required>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
            <div class="form-group" style="margin-bottom:0;">
                <label>Graduation Year</label>
                <input type="number" class="form-control edu-year" value="${year}" placeholder="2026" required>
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label>CGPA / Percentage</label>
                <input type="number" class="form-control edu-cgpa" step="0.01" value="${cgpa}" placeholder="e.g. 8.5">
            </div>
        </div>
    `;

    // Remove block logic
    block.querySelector('.builder-remove').onclick = () => {
        block.remove();
        updateResumePreview();
    };

    // Auto-update preview on typing
    block.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateResumePreview);
    });

    container.appendChild(block);
    updateResumePreview();
}

function addExperienceBlock(company = "", role = "", duration = "", desc = "") {
    const container = document.getElementById('builder-experience-container');
    const block = document.createElement('div');
    block.className = 'builder-entry';
    block.innerHTML = `
        <button type="button" class="builder-remove">&times;</button>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group" style="margin-bottom:8px;">
                <label>Company Name</label>
                <input type="text" class="form-control exp-company" value="${company}" required>
            </div>
            <div class="form-group" style="margin-bottom:8px;">
                <label>Job Role</label>
                <input type="text" class="form-control exp-role" value="${role}" placeholder="e.g. Backend Intern" required>
            </div>
        </div>
        <div class="form-group" style="margin-top: 8px; margin-bottom:8px;">
            <label>Duration</label>
            <input type="text" class="form-control exp-duration" value="${duration}" placeholder="e.g. June 2024 - Present" required>
        </div>
        <div class="form-group" style="margin-bottom:0;">
            <label>Role Description</label>
            <textarea class="form-control exp-desc" rows="3" required>${desc}</textarea>
        </div>
    `;

    block.querySelector('.builder-remove').onclick = () => {
        block.remove();
        updateResumePreview();
    };

    block.querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('input', updateResumePreview);
    });

    container.appendChild(block);
    updateResumePreview();
}

function addProjectBlock(title = "", stack = "", desc = "") {
    const container = document.getElementById('builder-projects-container');
    const block = document.createElement('div');
    block.className = 'builder-entry';
    block.innerHTML = `
        <button type="button" class="builder-remove">&times;</button>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group" style="margin-bottom:8px;">
                <label>Project Title</label>
                <input type="text" class="form-control proj-title" value="${title}" required>
            </div>
            <div class="form-group" style="margin-bottom:8px;">
                <label>Tech Stack Used</label>
                <input type="text" class="form-control proj-stack" value="${stack}" placeholder="e.g. Python, Docker, SQL" required>
            </div>
        </div>
        <div class="form-group" style="margin-top: 8px; margin-bottom:0;">
            <label>Project Description</label>
            <textarea class="form-control proj-desc" rows="3" required>${desc}</textarea>
        </div>
    `;

    block.querySelector('.builder-remove').onclick = () => {
        block.remove();
        updateResumePreview();
    };

    block.querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('input', updateResumePreview);
    });

    container.appendChild(block);
    updateResumePreview();
}

// Compile Form Inputs to Structured JSON Object
function compileResumeJson() {
    const summary = document.getElementById('resume-summary').value;
    const template_style = document.getElementById('resume-template-select').value;
    
    const education = [];
    document.querySelectorAll('#builder-education-container .builder-entry').forEach(el => {
        education.push({
            school: el.querySelector('.edu-school').value,
            degree: el.querySelector('.edu-degree').value,
            year: parseInt(el.querySelector('.edu-year').value) || 0,
            cgpa: parseFloat(el.querySelector('.edu-cgpa').value) || null
        });
    });

    const experience = [];
    document.querySelectorAll('#builder-experience-container .builder-entry').forEach(el => {
        experience.push({
            company: el.querySelector('.exp-company').value,
            role: el.querySelector('.exp-role').value,
            duration: el.querySelector('.exp-duration').value,
            description: el.querySelector('.exp-desc').value
        });
    });

    const projects = [];
    document.querySelectorAll('#builder-projects-container .builder-entry').forEach(el => {
        projects.push({
            title: el.querySelector('.proj-title').value,
            tech_stack: el.querySelector('.proj-stack').value,
            description: el.querySelector('.proj-desc').value
        });
    });

    return { summary, education, experience, projects, template_style };
}

// Render Preview dynamically
function updateResumePreview() {
    const preview = document.getElementById('resume-a4-preview');
    const data = compileResumeJson();
    
    // Apply template styling tags
    preview.className = `theme-${data.template_style}`;

    // Contact info (Use current student profile name if completed)
    const name = currentProfile ? currentProfile.full_name : currentUser.email.split('@')[0];
    const email = currentUser.email;
    const branch = currentProfile ? currentProfile.branch : "Undergraduate Student";
    const roll = currentProfile ? `Roll: ${currentProfile.roll_number}` : "";

    let eduHtml = '';
    data.education.forEach(edu => {
        const cgpaVal = edu.cgpa ? `CGPA: ${edu.cgpa}` : '';
        eduHtml += `
            <div class="preview-item">
                <div class="preview-item-header">
                    <span>${edu.degree} - ${edu.school}</span>
                    <span>${edu.year} ${cgpaVal ? `(${cgpaVal})` : ''}</span>
                </div>
            </div>
        `;
    });

    let expHtml = '';
    data.experience.forEach(exp => {
        expHtml += `
            <div class="preview-item">
                <div class="preview-item-header">
                    <span>${exp.role} at <strong>${exp.company}</strong></span>
                    <span>${exp.duration}</span>
                </div>
                <p style="margin-top: 4px; font-size:11px; color:#4b5563;">${exp.description}</p>
            </div>
        `;
    });

    let projHtml = '';
    data.projects.forEach(proj => {
        projHtml += `
            <div class="preview-item">
                <div class="preview-item-header">
                    <span><strong>${proj.title}</strong></span>
                    <span style="font-style: italic; font-size:11px; color:#4b5563;">Stack: ${proj.tech_stack}</span>
                </div>
                <p style="margin-top: 4px; font-size:11px; color:#4b5563;">${proj.description}</p>
            </div>
        `;
    });

    preview.innerHTML = `
        <div class="preview-header">
            <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 2px;">${name.toUpperCase()}</h1>
            <p style="font-size: 11px; color: #4b5563; font-weight: 500;">
                ${branch} ${roll ? `| ${roll}` : ''} | ${email}
            </p>
        </div>

        ${data.summary ? `
            <p style="font-size:11px; color:#374151; font-style: italic; margin-bottom: 12px;">${data.summary}</p>
        ` : ''}

        ${eduHtml ? `
            <div class="preview-section-title">Education</div>
            ${eduHtml}
        ` : ''}

        ${expHtml ? `
            <div class="preview-section-title">Work Experience</div>
            ${expHtml}
        ` : ''}

        ${projHtml ? `
            <div class="preview-section-title">Projects</div>
            ${projHtml}
        ` : ''}
    `;
}

// Fetch stored resume builder data on tab select
async function loadResumeBuilder() {
    if (!token) return;

    // Reset layout containers
    document.getElementById('builder-education-container').innerHTML = '';
    document.getElementById('builder-experience-container').innerHTML = '';
    document.getElementById('builder-projects-container').innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/students/resume-builder`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) return;

        const data = await res.json();
        
        document.getElementById('resume-summary').value = data.summary || '';
        document.getElementById('resume-template-select').value = data.template_style || 'classic';

        // Add education blocks
        data.education.forEach(edu => {
            addEducationBlock(edu.school, edu.degree, edu.year, edu.cgpa || "");
        });

        // Add experience blocks
        data.experience.forEach(exp => {
            addExperienceBlock(exp.company, exp.role, exp.duration, exp.description);
        });

        // Add projects blocks
        data.projects.forEach(proj => {
            addProjectBlock(proj.title, proj.tech_stack, proj.description);
        });

        // If all are empty, add at least one empty block for guiding
        if (data.education.length === 0) addEducationBlock();
        if (data.experience.length === 0) addExperienceBlock();
        if (data.projects.length === 0) addProjectBlock();

        updateResumePreview();
    } catch (err) {
        showToast("Error loading stored resume builder records", 'error');
    }
}

// Save Resume Data Submit
async function saveResumeBuilderData() {
    const data = compileResumeJson();

    try {
        const res = await fetch(`${API_URL}/students/resume-builder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const errMsg = await parseError(res);
            showToast(errMsg, 'error');
            return;
        }

        showToast("Resume template details saved successfully");
        updateResumePreview();
    } catch (err) {
        showToast("Connection failed saving builder details", 'error');
    }
}

// ATS Score Auditor click handler
async function triggerAtsEvaluation() {
    const data = compileResumeJson();

    try {
        const res = await fetch(`${API_URL}/students/ats-check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const errMsg = await parseError(res);
            showToast(errMsg, 'error');
            return;
        }

        const audit = await res.json();
        
        // 1. Overall ATS Dial Render
        document.getElementById('ats-score-display').innerText = `${audit.score} / 100`;
        document.getElementById('ats-score-bar').style.width = `${audit.score}%`;
        
        const scoreColors = {
            "success": "#10b981",
            "warning": "#f59e0b",
            "danger": "#ef4444"
        };
        let scoreColor = scoreColors.danger;
        if (audit.score >= 75) scoreColor = scoreColors.success;
        else if (audit.score >= 50) scoreColor = scoreColors.warning;
        
        document.getElementById('ats-score-display').style.color = scoreColor;
        document.getElementById('ats-score-bar').style.background = scoreColor;

        // 2. Length check audit details
        document.getElementById('ats-length-score').innerText = `${audit.length_check.score} / 25`;
        document.getElementById('ats-length-msg').innerText = audit.length_check.message;

        // 3. Keyword check audit details
        document.getElementById('ats-keyword-score').innerText = `${audit.keyword_check.score} / 25`;
        document.getElementById('ats-keyword-msg').innerText = audit.keyword_check.message;
        document.getElementById('ats-keyword-found').innerText = audit.keyword_check.found.join(', ') || 'None';
        document.getElementById('ats-keyword-missing').innerText = audit.keyword_check.missing.join(', ') || 'None';

        // 4. Skills match audit details
        document.getElementById('ats-skills-score').innerText = `${audit.skills_match.score} / 30`;
        document.getElementById('ats-skills-msg').innerText = audit.skills_match.message;
        document.getElementById('ats-skills-found').innerText = audit.skills_match.found.join(', ') || 'None';
        document.getElementById('ats-skills-missing').innerText = audit.skills_match.missing.join(', ') || 'None';

        // 5. Formatting warnings list
        const warningsBox = document.getElementById('ats-warnings-container');
        const warningsList = document.getElementById('ats-warnings-list');
        warningsList.innerHTML = '';

        if (audit.formatting_warnings.length > 0) {
            warningsBox.style.display = 'block';
            audit.formatting_warnings.forEach(warn => {
                const li = document.createElement('li');
                li.innerText = warn;
                warningsList.appendChild(li);
            });
        } else {
            warningsBox.style.display = 'none';
        }

        // Pop open ATS overlay
        authModalOverlay.classList.add('open');
        loginModalContent.style.display = 'none';
        registerModalContent.style.display = 'none';
        atsModalContent.style.display = 'block';

    } catch (err) {
        showToast("Network failed running ATS Auditor", 'error');
    }
}

// Load Recruiter Panel tools
async function loadRecruiterDashboard() {
    const companySelect = document.getElementById('job-company-select');
    companySelect.innerHTML = `<option value="">-- Choose Company --</option>`;
    
    try {
        const compRes = await fetch(`${API_URL}/jobs/companies`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (compRes.ok) {
            const companies = await compRes.json();
            companies.forEach(company => {
                const opt = document.createElement('option');
                opt.value = company.id;
                opt.innerText = company.name;
                companySelect.appendChild(opt);
            });
        }

        const jobFilterSelect = document.getElementById('recruiter-job-select-filter');
        jobFilterSelect.innerHTML = `<option value="">Select Job to View Applicants</option>`;
        
        const jobsRes = await fetch(`${API_URL}/jobs?active_only=false`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (jobsRes.ok) {
            const jobs = await jobsRes.json();
            jobs.forEach(job => {
                const opt = document.createElement('option');
                opt.value = job.id;
                opt.innerText = `${job.title} - ${job.company.name}`;
                jobFilterSelect.appendChild(opt);
            });
        }

        jobFilterSelect.onchange = (e) => {
            const val = e.target.value;
            if (val) {
                loadJobApplicants(parseInt(val));
            } else {
                document.getElementById('recruiter-applicants-table-body').innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Select a job to list applicants.</td></tr>`;
            }
        };

    } catch (err) {
        showToast("Error configuring recruiter dropdown fields", "error");
    }
}

// Load Candidates for a specific Job
async function loadJobApplicants(jobId) {
    const tbody = document.getElementById('recruiter-applicants-table-body');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Loading applicants...</td></tr>`;

    try {
        const res = await fetch(`${API_URL}/applications/job/${jobId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">Failed to pull candidates records.</td></tr>`;
            return;
        }

        const apps = await res.json();
        if (apps.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No applications submitted yet for this position.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        apps.forEach(app => {
            const student = app.student;
            const profile = student.student_profile;
            
            const candidateName = profile ? profile.full_name : "Unnamed User";
            const candidateCgpa = profile ? profile.cgpa : "N/A";
            const candidateBranch = profile ? profile.branch : "N/A";
            
            let resumeLinkHtml = '<span style="color: var(--text-secondary);">No resume</span>';
            if (profile && profile.resume_filename) {
                resumeLinkHtml = `<a class="btn btn-secondary btn-small" href="${API_URL}/students/${student.id}/resume" download="${candidateName}_resume" style="padding: 4px 8px; font-size: 12px;">Download</a>`;
            }

            const row = document.createElement('tr');
            
            const statuses = ['applied', 'shortlisted', 'interviewing', 'offered', 'rejected'];
            let statusOptions = '';
            statuses.forEach(s => {
                statusOptions += `<option value="${s}" ${app.status === s ? 'selected' : ''}>${s}</option>`;
            });

            row.innerHTML = `
                <td style="font-weight: 600;">${candidateName}</td>
                <td>${candidateCgpa}</td>
                <td>${candidateBranch}</td>
                <td>${resumeLinkHtml}</td>
                <td>${app.job.title}</td>
                <td>
                    <select class="form-control" style="padding: 4px 8px; font-size: 13px; width: 140px; display: inline-block;" onchange="changeApplicationStatus(${app.id}, this.value)">
                        ${statusOptions}
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">Network communication failed.</td></tr>`;
    }
}

// Recruiter Status Change Action
async function changeApplicationStatus(appId, newStatus) {
    try {
        const res = await fetch(`${API_URL}/applications/${appId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!res.ok) {
            const errMsg = await parseError(res);
            showToast(errMsg, 'error');
            return;
        }

        showToast(`Application status updated to ${newStatus}`);
    } catch (err) {
        showToast("Connection issue updating status", 'error');
    }
}
