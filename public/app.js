document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let currentWeather = null;
    let currentCity = 'Pune';
    let chatHistory = [];
    let initialPlanCalibrated = false;

    // DOM Elements - General / Header
    const txtCitySearch = document.getElementById('txt-city-search');
    const lblWeatherUpdated = document.getElementById('lbl-weather-updated');
    const weatherIconContainer = document.getElementById('weather-icon-container');
    const lblWeatherTemp = document.getElementById('lbl-weather-temp');
    const lblWeatherCondition = document.getElementById('lbl-weather-condition');
    const lblWeatherFeels = document.getElementById('lbl-weather-feels');
    const lblWeatherHumidity = document.getElementById('lbl-weather-humidity');
    const lblWeatherWind = document.getElementById('lbl-weather-wind');
    const lblWeatherPrecipitation = document.getElementById('lbl-weather-precipitation');

    // Weather Alert Card
    const weatherAlertCard = document.getElementById('weather-alert-card');
    const lblAlertHeadline = document.getElementById('lbl-alert-headline');
    const lblAlertBody = document.getElementById('lbl-alert-body');
    const btnViewAlert = document.getElementById('btn-view-alert');

    // Profiler Form
    const formProfiler = document.getElementById('form-profiler');
    const selHouseType = document.getElementById('sel-house-type');
    const numFamilySize = document.getElementById('num-family-size');
    const selLanguage = document.getElementById('sel-language');
    const btnRecalibrate = document.getElementById('btn-recalibrate');
    const btnRecalibrateText = btnRecalibrate.querySelector('.btn-text');
    const recalibrateSpinner = btnRecalibrate.querySelector('.spinner');

    // Quick Action Nav Cards
    const quickNavCards = document.querySelectorAll('.nav-card');
    const topNavLinks = document.querySelectorAll('.top-nav .nav-link');
    const tabContents = document.querySelectorAll('.tab-content');

    // Tab Contents - Preparedness Plan
    const planTimelineGrid = document.querySelector('.plan-timeline-grid');

    // Tab Contents - Travel Advisory
    const cardTravelAdvisoryBox = document.getElementById('card-travel-advisory-box');
    const lblTravelAdvisoryStatus = document.getElementById('lbl-travel-advisory-status');
    const lblTravelCommuteRecommendation = document.getElementById('lbl-travel-commute-recommendation');
    const lstTravelTipsList = document.getElementById('lst-travel-tips-list');
    const lstTravelContacts = document.getElementById('lst-travel-contacts');

    // Tab Contents - Safety Guidelines (Resources)
    const lstResourceHome = document.getElementById('lst-resource-home');
    const lstResourceHealth = document.getElementById('lst-resource-health');

    // Tab Contents - Emergency Kit
    const lblKitProgressText = document.getElementById('lbl-kit-progress-text');
    const kitProgressBar = document.getElementById('kit-progress-bar');
    const lstKitCategories = document.getElementById('lst-kit-categories');

    // Tab Contents - Chat Assistant
    const lblChatLanguageBadge = document.getElementById('lbl-chat-language-badge');
    const chatMessages = document.getElementById('chat-messages');
    const formChatSubmit = document.getElementById('form-chat-submit');
    const txtChatQuery = document.getElementById('txt-chat-query');

    // Hero quick ask form
    const formHeroAsk = document.getElementById('form-hero-ask');
    const txtHeroQuestion = document.getElementById('txt-hero-question');

    // Tip Banner
    const bannerMonsoonTip = document.getElementById('banner-monsoon-tip');
    const btnCloseTip = document.getElementById('btn-close-tip');

    // Notifications and Alerts
    const btnToggleNotifications = document.getElementById('btn-toggle-notifications');
    const lstDashboardAlerts = document.getElementById('lst-dashboard-alerts');

    // --- Weather Fetching API Call ---
    async function fetchWeather(city) {
        lblWeatherUpdated.textContent = 'Updating...';
        if (btnRecalibrate) {
            btnRecalibrate.disabled = true;
            btnRecalibrateText.textContent = 'Loading weather...';
        }
        try {
            const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch weather.');
            }

            currentWeather = data;
            currentCity = data.cityName;

            // Render Weather Card info
            txtCitySearch.value = `${data.cityName}, ${data.region}`;
            lblWeatherUpdated.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            lblWeatherTemp.textContent = `${Math.round(data.current.temp)}°C`;
            lblWeatherCondition.textContent = getWeatherDesc(data.current.weatherCode);
            lblWeatherFeels.textContent = `Feels like ${Math.round(data.current.feelsLike)}°C`;
            lblWeatherHumidity.textContent = `${data.current.humidity}%`;
            lblWeatherWind.textContent = `${data.current.windSpeed} km/h`;
            lblWeatherPrecipitation.textContent = `${data.current.rain > 0 ? 100 : 0}%`;

            // Render Weather Icon based on rain
            weatherIconContainer.innerHTML = getWeatherSVG(data.current.rain);

            // Update Alert Card based on Rainfall
            const rainVal = data.current.rain;
            if (rainVal > 25) {
                lblAlertHeadline.textContent = 'Severe Rainfall Warning';
                lblAlertBody.textContent = 'Heavy rainfall is active. Avoid low-lying areas, keep emergency tools active, and limit commutes.';
                weatherAlertCard.style.backgroundColor = '#fef2f2';
                weatherAlertCard.style.borderColor = '#fee2e2';
                weatherAlertCard.querySelector('.alert-header').style.color = 'var(--danger)';
            } else if (rainVal > 5) {
                lblAlertHeadline.textContent = 'Moderate Rain Alert';
                lblAlertBody.textContent = 'Constant rainfall is observed. Waterlogging is possible in low-lying roads. Travel with caution.';
                weatherAlertCard.style.backgroundColor = '#fffbeb';
                weatherAlertCard.style.borderColor = '#fef3c7';
                weatherAlertCard.querySelector('.alert-header').style.color = 'var(--warning)';
            } else {
                lblAlertHeadline.textContent = 'Clear Weather Conditions';
                lblAlertBody.textContent = 'Weather is currently clear/mild. Keep emergency systems primed for upcoming shifts.';
                weatherAlertCard.style.backgroundColor = '#f0fdf4';
                weatherAlertCard.style.borderColor = '#dcfce7';
                weatherAlertCard.querySelector('.alert-header').style.color = 'var(--success)';
            }

            // Sync recent dashboard alerts dynamically
            updateDashboardAlerts(data.cityName, rainVal);

            // Re-enable recalibrate button
            if (btnRecalibrate) {
                btnRecalibrate.disabled = false;
                btnRecalibrateText.textContent = 'Recalibrate Plan';
            }

            // Trigger initial Pune plan load
            if (!initialPlanCalibrated) {
                initialPlanCalibrated = true;
                setTimeout(() => {
                    formProfiler.dispatchEvent(new Event('submit'));
                }, 300);
            }

            // Enable view alerts button once loaded
            if (btnViewAlert) {
                btnViewAlert.disabled = false;
                btnViewAlert.textContent = 'View Alerts';
            }

        } catch (error) {
            console.error('Weather error:', error);
            txtCitySearch.value = city;
            lblWeatherUpdated.textContent = 'Fetch failed';
            if (btnRecalibrate) {
                btnRecalibrate.disabled = false;
                btnRecalibrateText.textContent = 'Recalibrate Plan';
            }
        }
    }

    // WMO Weather mapping description
    function getWeatherDesc(code) {
        if (code === 0) return 'Clear Sky';
        if (code >= 1 && code <= 3) return 'Partly Cloudy';
        if (code >= 45 && code <= 48) return 'Foggy Conditions';
        if (code >= 51 && code <= 55) return 'Light Drizzle';
        if (code >= 61 && code <= 65) return 'Moderate Rain';
        if (code >= 80 && code <= 82) return 'Heavy Showers';
        if (code >= 95 && code <= 99) return 'Thunderstorm⛈️';
        return 'Overcast';
    }

    // Weather SVG code provider
    function getWeatherSVG(rain) {
        if (rain > 15) {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>`;
        } else if (rain > 0) {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v2"/><path d="M12 17v4"/><path d="M16 19v2"/></svg>`;
        } else {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
        }
    }

    // Listen weather location searches
    txtCitySearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = txtCitySearch.value.trim();
            if (city) fetchWeather(city);
        }
    });

    txtCitySearch.addEventListener('blur', () => {
        const city = txtCitySearch.value.trim();
        if (city) fetchWeather(city);
    });

    // --- Tab Selection Logic ---
    function activateTab(tabId) {
        // Toggle tab content panels
        tabContents.forEach(content => {
            if (content.id === tabId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Toggle Quick nav button highlights
        quickNavCards.forEach(card => {
            if (card.getAttribute('data-tab') === tabId) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        // Toggle Top Header nav highlights
        topNavLinks.forEach(link => {
            if (link.getAttribute('data-target') === tabId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Scroll chat if needed
        if (tabId === 'tab-chat') {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    quickNavCards.forEach(card => {
        card.addEventListener('click', () => {
            const tabId = card.getAttribute('data-tab');
            activateTab(tabId);
        });
    });

    topNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const tabId = link.getAttribute('data-target');
            if (tabId) {
                e.preventDefault();
                activateTab(tabId);
                // Scroll page down to workspace section
                document.getElementById('section-tabs').scrollIntoView({ behavior: 'smooth' });
            } else {
                // Return to home link
                topNavLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });

    // Logo click goes home
    document.getElementById('logo-home').addEventListener('click', () => {
        topNavLinks[0].click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Alert Banner trigger
    btnViewAlert.addEventListener('click', () => {
        activateTab('tab-plan');
        document.getElementById('section-tabs').scrollIntoView({ behavior: 'smooth' });
    });

    // --- Profiler Form recalibration ---
    formProfiler.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentWeather) {
            console.warn('Weather data is currently loading.');
            return;
        }

        const houseType = selHouseType.value;
        const familySize = parseInt(numFamilySize.value);
        const language = selLanguage.value;

        // Gather vulnerabilities
        const vulnerabilities = [];
        document.querySelectorAll('input[name="vulnerabilities"]:checked').forEach(cb => {
            vulnerabilities.push(cb.value);
        });
        const vulnerableFactors = vulnerabilities.join(', ') || 'None';

        // Set Loading state
        btnRecalibrate.disabled = true;
        btnRecalibrateText.textContent = 'Generating Plan...';
        recalibrateSpinner.classList.remove('hidden');

        try {
            const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    city: currentCity,
                    weather: currentWeather,
                    houseType,
                    familySize,
                    vulnerableFactors,
                    language
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to calibrate plan.');

            // Render output lists
            renderSafetyPlan(data, language);

            // Auto-scroll details
            document.getElementById('section-tabs').scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('Calibration error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            btnRecalibrate.disabled = false;
            btnRecalibrateText.textContent = 'Recalibrate Plan';
            recalibrateSpinner.classList.add('hidden');
        }
    });

    // --- Render safety plan datasets into DOM ---
    function renderSafetyPlan(plan, language) {
        // --- 1. Preparedness Plan Timeline Grid ---
        planTimelineGrid.innerHTML = '';
        if (plan.preparednessPlan && plan.preparednessPlan.length > 0) {
            plan.preparednessPlan.forEach(stage => {
                const card = document.createElement('div');
                
                // Add specific styling subclasses depending on stage name
                const stageName = (stage.stage || '').toLowerCase();
                let stageClass = 'stage-pre';
                if (stageName.includes('active') || stageName.includes('during')) {
                    stageClass = 'stage-active';
                } else if (stageName.includes('recovery') || stageName.includes('after')) {
                    stageClass = 'stage-recovery';
                }
                
                card.className = `timeline-stage-card ${stageClass}`;

                const h3 = document.createElement('h3');
                h3.textContent = stage.stage;

                const ul = document.createElement('ul');
                ul.className = 'timeline-stage-tasks';

                stage.tasks.forEach(task => {
                    const li = document.createElement('li');
                    li.textContent = task;
                    ul.appendChild(li);
                });

                card.appendChild(h3);
                card.appendChild(ul);
                planTimelineGrid.appendChild(card);
            });
        }

        // --- 2. Travel Advisory ---
        const travelStatus = plan.travelAdvisory?.status || 'Safe';
        const travelColor = getTravelColor(travelStatus);
        
        lblTravelAdvisoryStatus.className = `travel-status-label ${travelColor}`;
        lblTravelAdvisoryStatus.textContent = travelStatus;
        lblTravelCommuteRecommendation.textContent = plan.travelAdvisory?.commuteRecommendation || '';

        const boxTravel = cardTravelAdvisoryBox;
        if (travelColor === 'avoid') {
            boxTravel.style.borderColor = 'var(--danger)';
        } else if (travelColor === 'caution') {
            boxTravel.style.borderColor = 'var(--warning)';
        } else {
            boxTravel.style.borderColor = 'var(--success)';
        }

        populateList(lstTravelTipsList, plan.travelAdvisory?.tips);

        // Travel emergency helplines
        lstTravelContacts.innerHTML = '';
        if (plan.safetyRecommendations?.emergencyContacts) {
            plan.safetyRecommendations.emergencyContacts.forEach(contact => {
                const card = document.createElement('div');
                card.className = 'contact-card';

                const name = document.createElement('span');
                name.className = 'name';
                name.textContent = contact.name;

                const num = document.createElement('span');
                num.className = 'number';
                num.textContent = contact.number;

                card.appendChild(name);
                card.appendChild(num);
                lstTravelContacts.appendChild(card);
            });
        }

        // --- 3. Safety Guidelines (Resources) ---
        populateList(lstResourceHome, plan.safetyRecommendations?.homeProtection);
        populateList(lstResourceHealth, plan.safetyRecommendations?.healthGuideline);

        // --- 4. Emergency Kit Tab Checklist ---
        renderEmergencyKitChecklist(plan.emergencyChecklist);

        // --- 5. AI Assistant chat state config ---
        lblChatLanguageBadge.textContent = `Responding in ${language}`;
        chatHistory = [];
        chatMessages.innerHTML = ''; // reset chat content

        let greeting = 'Hello! I am your MonsoonShield assistant. I can answer details about the current weather, personalized checklists, or guide you during flood scenarios. How can I help you today?';
        if (language === 'Hindi') {
            greeting = 'नमस्ते! मैं आपका मानसूनशील्ड (MonsoonShield) सहायक हूँ। मैं मौसम की स्थिति, चेकलिस्ट या बाढ़ की तैयारियों के बारे में आपके प्रश्नों के उत्तर दे सकता हूँ। मैं आपकी क्या मदद कर सकता हूँ?';
        } else if (language === 'Marathi') {
            greeting = 'नमस्कार! मी आपला मान्सूनशील्ड (MonsoonShield) सहाय्यक आहे। मी हवामान, आवश्यक वस्तूंची यादी किंवा आपत्कालीन नियोजनाबद्दल आपल्या प्रश्नांची उत्तरे देण्यास तयार आहे। मी काय मदत करू शकतो?';
        } else if (language === 'Bengali') {
            greeting = 'নমস্কার! আমি আপনার মনসুনশিল্ড (MonsoonShield) সহকারী। আমি আবহাওয়া, জরুরি কিট এবং বন্যা প্রস্তুতি সম্পর্কিত তথ্য দিয়ে সাহায্য করতে পারি। বলুন কিভাবে সাহায্য করতে পারি?';
        } else if (language === 'Tamil') {
            greeting = 'வணக்கம்! நான் உங்கள் மான்சூன்ஷீல்ட் (MonsoonShield) உதவியாளர். வானிலை அல்லது பேரிடர் அவசரகால திட்டங்கள் பற்றிய தகவல்களை வழங்க நான் தயாராக உள்ளேன். நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?';
        } else if (language === 'Telugu') {
            greeting = 'నమస్కారం! నేను మీ మాన్‌సూన్ షీల్డ్ (MonsoonShield) సహాయకుడిని. వాతావరణం, అత్యవసర కిట్ మరియు వరదల సన్నద్ధత గురించి సమాచారంతో సహాయం చేయగలను. మీకు ఎలా సహాయపడగలను?';
        }

        appendChatMessage('assistant', greeting);
    }

    // Helper: Map travel Advisory coloring
function getTravelColor(status) {
        const s = status.toLowerCase();
        if (s.includes('avoid') || s.includes('danger') || s.includes('stay')) return 'avoid';
        if (s.includes('caution') || s.includes('exercise') || s.includes('warning')) return 'caution';
        return 'safe';
    }

    // Helper: Populate List
    function populateList(element, items) {
        element.innerHTML = '';
        if (!items || items.length === 0) {
            element.innerHTML = '<li>No recommendations loaded.</li>';
            return;
        }
        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            element.appendChild(li);
        });
    }

    // Render categorized emergency kit checklist
    function renderEmergencyKitChecklist(checklist) {
        lstKitCategories.innerHTML = '';
        if (!checklist || checklist.length === 0) {
            lstKitCategories.innerHTML = '<p class="text-secondary text-center">No items generated.</p>';
            updateKitProgress(0, 0);
            return;
        }

        checklist.forEach((categoryBlock, catIndex) => {
            const block = document.createElement('div');
            block.className = 'kit-category-block';

            const h3 = document.createElement('h3');
            h3.textContent = categoryBlock.category;
            block.appendChild(h3);

            categoryBlock.items.forEach((item, itemIndex) => {
                const uniqueId = `kit-item-${catIndex}-${itemIndex}`;

                const label = document.createElement('label');
                label.className = 'kit-item';
                label.id = `lbl-${uniqueId}`;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'kit-checkbox';
                checkbox.id = `chk-${uniqueId}`;

                const content = document.createElement('div');
                content.className = 'kit-item-content';

                const nameSpan = document.createElement('span');
                nameSpan.className = 'kit-item-name';
                nameSpan.textContent = item.name;

                const prio = document.createElement('span');
                const pClass = (item.priority || 'medium').toLowerCase();
                prio.className = `kit-item-priority ${pClass}`;
                prio.textContent = item.priority || 'medium';

                const desc = document.createElement('span');
                desc.className = 'kit-item-desc';
                desc.textContent = item.details || '';

                content.appendChild(nameSpan);
                content.appendChild(prio);
                content.appendChild(desc);

                label.appendChild(checkbox);
                label.appendChild(content);
                block.appendChild(label);

                // Add checklist tick triggers
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        label.classList.add('checked');
                    } else {
                        label.classList.remove('checked');
                    }
                    recalculateKitProgress();
                });
            });

            lstKitCategories.appendChild(block);
        });

        recalculateKitProgress();
    }

    function recalculateKitProgress() {
        const total = lstKitCategories.querySelectorAll('.kit-checkbox').length;
        const checked = lstKitCategories.querySelectorAll('.kit-checkbox:checked').length;
        updateKitProgress(checked, total);
    }

    function updateKitProgress(checked, total) {
        const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
        kitProgressBar.style.width = `${percent}%`;
        lblKitProgressText.textContent = `${percent}% Prepared (${checked}/${total})`;
    }

    // --- Chat interaction triggers ---
    function appendChatMessage(role, text) {
        const div = document.createElement('div');
        div.className = `message ${role}`;

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = parseChatMarkdown(text);

        div.appendChild(content);
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (role !== 'system') {
            chatHistory.push({ role, text });
        }
    }

    // Basic markdown helper
    function parseChatMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^\s*\n/gm, '')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^- (.*)$/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
            .replace(/<\/ul>\s*<ul>/g, '');
    }

    formChatSubmit.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = txtChatQuery.value.trim();
        if (!message) return;

        // Append user query bubble
        appendChatMessage('user', message);
        txtChatQuery.value = '';

        // Show typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant chat-typing-indicator';
        typingDiv.innerHTML = '<div class="message-content"><span class="spinner"></span> Assistant is typing...</div>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Context details
        const houseType = selHouseType.value;
        const familySize = parseInt(numFamilySize.value);
        const language = selLanguage.value;
        
        const vulnerabilities = [];
        document.querySelectorAll('input[name="vulnerabilities"]:checked').forEach(cb => {
            vulnerabilities.push(cb.value);
        });
        const vulnerableFactors = vulnerabilities.join(', ') || 'None';

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    history: chatHistory.slice(-10),
                    city: currentCity,
                    weather: currentWeather,
                    houseType,
                    familySize,
                    vulnerableFactors,
                    language
                })
            });

            const data = await response.json();
            
            // Clear typing loader
            const indicator = chatMessages.querySelector('.chat-typing-indicator');
            if (indicator) indicator.remove();

            if (!response.ok) throw new Error(data.error || 'Failed chat response.');

            appendChatMessage('assistant', data.reply);

        } catch (error) {
            console.error('Chat query error:', error);
            const indicator = chatMessages.querySelector('.chat-typing-indicator');
            if (indicator) indicator.remove();
            appendChatMessage('assistant', `Error: ${error.message}`);
        }
    });

    // --- Hero Section Quick Ask ---
    formHeroAsk.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = txtHeroQuestion.value.trim();
        if (!query) return;

        // Activate Chat Tab
        activateTab('tab-chat');
        
        // Pre-fill chat query input and send it
        txtChatQuery.value = query;
        txtHeroQuestion.value = '';
        
        // Trigger submit
        formChatSubmit.dispatchEvent(new Event('submit'));

        // Scroll to chat box
        document.getElementById('section-tabs').scrollIntoView({ behavior: 'smooth' });
    });

    // --- Secondary Grid & Interactions ---
    // Handle Today's Preparedness ticks
    const dashboardCheckboxes = document.querySelectorAll('#lst-dashboard-quick-prep input[type="checkbox"]');
    const lblDashboardPrepStatus = document.getElementById('lbl-dashboard-prep-status');

    function updateDashboardPrepStatus() {
        const total = dashboardCheckboxes.length;
        const checked = document.querySelectorAll('#lst-dashboard-quick-prep input[type="checkbox"]:checked').length;
        lblDashboardPrepStatus.textContent = `${checked}/${total} Completed`;
    }

    dashboardCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            updateDashboardPrepStatus();
        });
    });

    updateDashboardPrepStatus();

    // Toggle Notifications
    btnToggleNotifications.addEventListener('click', () => {
        if (btnToggleNotifications.textContent.includes('Enable')) {
            btnToggleNotifications.textContent = 'Notifications Enabled';
            btnToggleNotifications.style.background = 'var(--success)';
            alert('Notifications enabled! You will now receive instant warnings and travel updates.');
        } else {
            btnToggleNotifications.textContent = 'Enable Notifications';
            btnToggleNotifications.style.background = 'var(--primary)';
        }
    });

    // Close Tip Banner
    btnCloseTip.addEventListener('click', () => {
        bannerMonsoonTip.style.display = 'none';
    });

    // Recent dashboard alerts click triggers Preparedness Plan tab
    document.getElementById('lnk-view-all-alerts').addEventListener('click', (e) => {
        e.preventDefault();
        activateTab('tab-plan');
        document.getElementById('section-tabs').scrollIntoView({ behavior: 'smooth' });
    });

    // Helper: Dynamic dashboard alert list renderer based on rain
    function updateDashboardAlerts(cityName, rain) {
        lstDashboardAlerts.innerHTML = '';
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (rain > 25) {
            lstDashboardAlerts.innerHTML = `
                <div class="alert-item red-alert">
                    <span class="icon">⚠️</span>
                    <div class="text">
                        <strong>Severe Rainfall Warning in ${cityName}</strong>
                        <small>${timestamp} - IMD Alert</small>
                    </div>
                </div>
                <div class="alert-item yellow-alert">
                    <span class="icon">🔄</span>
                    <div class="text">
                        <strong>Critical Waterlogging in low areas</strong>
                        <small>Just now - Municipal Control</small>
                    </div>
                </div>
            `;
        } else if (rain > 5) {
            lstDashboardAlerts.innerHTML = `
                <div class="alert-item yellow-alert">
                    <span class="icon">⚠️</span>
                    <div class="text">
                        <strong>Moderate Rain Advisory in ${cityName}</strong>
                        <small>${timestamp} - Local Advisory</small>
                    </div>
                </div>
                <div class="alert-item green-alert">
                    <span class="icon">✅</span>
                    <div class="text">
                        <strong>Major Expressway routes reported clear</strong>
                        <small>2 hours ago - Traffic police</small>
                    </div>
                </div>
            `;
        } else {
            lstDashboardAlerts.innerHTML = `
                <div class="alert-item green-alert">
                    <span class="icon">✅</span>
                    <div class="text">
                        <strong>Normal Weather Conditions in ${cityName}</strong>
                        <small>${timestamp} - IMD</small>
                    </div>
                </div>
                <div class="alert-item green-alert">
                    <span class="icon">✅</span>
                    <div class="text">
                        <strong>Travel routes clear across the region</strong>
                        <small>1 day ago - Traffic control</small>
                    </div>
                </div>
            `;
        }
    }

    // Trigger initial search for Pune on load
    fetchWeather('Pune');
});
