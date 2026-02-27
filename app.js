// 1. Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered Successfully!', reg.scope))
            .catch(err => console.error('Service Worker Registration Failed!', err));
    });
}

// 2. Mock Data for CSR Jobs
const mockJobs = [
    {
        title: "Head of CSR & Sustainability",
        company: "TechForGood India",
        location: "Whitefield, Bangalore",
        type: "Full-Time",
        category: "Leadership"
    },
    {
        title: "Community Program Manager",
        company: "Wipro Cares",
        location: "Sarjapur, Bangalore",
        type: "Hybrid",
        category: "Operations"
    },
    {
        title: "ESG Reporting Analyst",
        company: "GreenFuture Corp",
        location: "Indiranagar, Bangalore",
        type: "Remote",
        category: "Analytics"
    },
    {
        title: "Social Impact Coordinator",
        company: "Infosys Foundation",
        location: "Electronic City, Bangalore",
        type: "Full-Time",
        category: "Field Work"
    }
];

// 3. Render jobs to the DOM
function renderJobs(jobs) {
    const jobList = document.getElementById('job-list');
    jobList.innerHTML = '';
    
    // Slight delay for animation effect
    jobs.forEach((job, index) => {
        setTimeout(() => {
            const card = document.createElement('div');
            card.className = 'job-card';
            card.style.animation = `fadeIn 0.5s ease forwards`;
            card.style.opacity = '0';
            
            card.innerHTML = `
                <div class="job-header">
                    <div>
                        <h3 class="job-title">${job.title}</h3>
                        <div class="job-company">${job.company}</div>
                    </div>
                </div>
                <div class="job-location">📍 ${job.location}</div>
                <div class="job-tags">
                    <span class="tag">${job.type}</span>
                    <span class="tag">${job.category}</span>
                </div>
            `;
            jobList.appendChild(card);
        }, index * 100); // Staggered animation
    });
}

// Helper CSS for animation injected dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);

// Initial render
document.addEventListener('DOMContentLoaded', () => {
    renderJobs(mockJobs);
});
