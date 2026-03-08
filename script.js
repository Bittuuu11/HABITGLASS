document.addEventListener('DOMContentLoaded', () => {
    // --- State & Data ---
    let habits = JSON.parse(localStorage.getItem('habits')) || [
        { id: 1, name: 'Wake up 5 AM', goal: 30 },
        { id: 2, name: 'Workout', goal: 30 },
        { id: 3, name: 'Meditation', goal: 30 },
        { id: 4, name: 'Project Work', goal: 30 }
    ];

    let habitLogs = JSON.parse(localStorage.getItem('habitLogs')) || [];

    let currentEditingHabitId = null;
    const now = new Date();
    let currentYear = now.getFullYear();
    let currentMonth = now.getMonth(); // 0-indexed
    let daysInMonth;
    const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

    // --- DOM Elements ---
    const habitListEl = document.getElementById('habitList');
    const trackerGridEl = document.getElementById('trackerGrid');
    const analyticsBodyEl = document.getElementById('analyticsBody');
    const globalProgressPercentEl = document.getElementById('globalProgressPercent');
    const globalProgressBarEl = document.getElementById('globalProgressBar');
    const totalCompletedTextEl = document.getElementById('totalCompletedText');
    const currentMonthTextEl = document.getElementById('currentMonthText');
    const habitModal = document.getElementById('habitModal');
    const habitNameInput = document.getElementById('habitNameInput');
    const habitFrequencyInput = document.getElementById('habitFrequencyInput');
    const modalTitle = document.getElementById('modalTitle');
    const addHabitBtn = document.getElementById('addHabitBtn');
    const saveHabitBtn = document.getElementById('saveHabitBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const deleteHabitBtn = document.getElementById('deleteHabitBtn');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const weekdaySelector = document.getElementById('weekdaySelector');
    const dayButtons = document.querySelectorAll('.day-btn');

    let chart = null;

    // --- Initialization ---
    function init() {
        daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        currentMonthTextEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
        
        renderHabits();
        renderGrid();
        renderAnalytics();
        updateGlobalStats();
        
        if (chart) {
            chart.destroy();
        }
        initChart();
        setupTheme();
    }

    function changeMonth(delta) {
        currentMonth += delta;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        } else if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        init();
    }

    prevMonthBtn.onclick = () => changeMonth(-1);
    nextMonthBtn.onclick = () => changeMonth(1);

    // Weekday Selection Logic
    dayButtons.forEach(btn => {
        btn.onclick = () => {
            btn.classList.toggle('active');
        };
    });

    habitFrequencyInput.onchange = () => {
        weekdaySelector.style.display = habitFrequencyInput.value === 'custom' ? 'block' : 'none';
    };

    // --- Render Functions ---
    function renderHabits() {
        habitListEl.innerHTML = '';
        habits.forEach(habit => {
            const streak = calculateStreak(habit);
            let freqLabel = 'Daily';
            if (habit.frequency === 'weekdays') freqLabel = 'Weekdays';
            else if (habit.frequency === 'weekends') freqLabel = 'Weekends';
            else if (habit.frequency === 'custom') freqLabel = 'Custom';

            const card = document.createElement('div');
            card.className = 'glass-card habit-item';
            card.innerHTML = `
                <div style="flex: 1;">
                    <div class="habit-name">${habit.name}</div>
                    <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                        <span style="font-size: 0.65rem; color: var(--accent); background: var(--accent-glow); padding: 2px 6px; border-radius: 4px;">${freqLabel}</span>
                        <span style="font-size: 0.7rem; color: var(--text-secondary);">🔥 ${streak} day streak</span>
                    </div>
                </div>
                <button class="edit-btn" style="background:none; border:none; cursor:pointer; font-size: 1.2rem;" onclick="editHabit(${habit.id})">⚙️</button>
            `;
            habitListEl.appendChild(card);
        });
    }

    function renderGrid() {
        trackerGridEl.innerHTML = '';
        trackerGridEl.style.gridTemplateColumns = `180px repeat(${daysInMonth}, 1fr)`;
        const dayNamesShort = ["S", "M", "T", "W", "T", "F", "S"];
        
        // Header Row
        const header = document.createElement('div');
        header.className = 'grid-header';
        
        let headerHTML = `<div class="grid-cell sticky">Habit / Day</div>`;
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(currentYear, currentMonth, i);
            const dayName = dayNamesShort[d.getDay()];
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            headerHTML += `
                <div class="grid-cell" style="flex-direction: column; gap: 2px; ${isWeekend ? 'color: var(--accent); font-weight: 700;' : ''}">
                    <span style="font-size: 0.6rem; opacity: 0.6;">${dayName}</span>
                    <span>${i}</span>
                </div>`;
        }
        header.innerHTML = headerHTML;
        trackerGridEl.appendChild(header);

        // Habit Rows
        habits.forEach(habit => {
            const row = document.createElement('div');
            row.className = 'grid-row';
            
            let rowHTML = `<div class="grid-cell sticky">${habit.name}</div>`;
            for (let day = 1; day <= daysInMonth; day++) {
                const dateKey = `${currentYear}-${currentMonth + 1}-${day}`;
                const dateObj = new Date(currentYear, currentMonth, day);
                const dayOfWeek = dateObj.getDay();
                
                const isScheduled = isHabitScheduledToday(habit, dayOfWeek);
                const isCompleted = habitLogs.some(log => log.habitId === habit.id && log.date === dateKey && log.completed);
                
                if (isScheduled) {
                    rowHTML += `
                        <div class="grid-cell">
                            <label class="checkbox-container">
                                <input type="checkbox" ${isCompleted ? 'checked' : ''} onchange="toggleHabit(${habit.id}, '${dateKey}', this.checked)">
                                <span class="checkmark"></span>
                            </label>
                        </div>
                    `;
                } else {
                    rowHTML += `
                        <div class="grid-cell" style="opacity: 0.2;">
                            <span style="font-size: 0.6rem;">—</span>
                        </div>
                    `;
                }
            }
            row.innerHTML = rowHTML;
            trackerGridEl.appendChild(row);
        });
    }

    function isHabitScheduledToday(habit, dayOfWeek) {
        if (!habit.frequency || habit.frequency === 'daily') return true;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (habit.frequency === 'weekdays') return !isWeekend;
        if (habit.frequency === 'weekends') return isWeekend;
        if (habit.frequency === 'custom' && habit.selectedDays) {
            return habit.selectedDays.includes(dayOfWeek);
        }
        return true;
    }

    function renderAnalytics() {
        analyticsBodyEl.innerHTML = '';
        habits.forEach(habit => {
            const completedCount = habitLogs.filter(log => log.habitId === habit.id && log.completed).length;
            
            let scheduledDaysInMonth = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                const dateObj = new Date(currentYear, currentMonth, d);
                if (isHabitScheduledToday(habit, dateObj.getDay())) scheduledDaysInMonth++;
            }
            
            const progress = scheduledDaysInMonth > 0 ? (completedCount / scheduledDaysInMonth) * 100 : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${habit.name}</td>
                <td>${scheduledDaysInMonth}</td>
                <td>${completedCount}</td>
                <td>
                    <div class="mini-progress">
                        <div class="mini-progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                </td>
            `;
            analyticsBodyEl.appendChild(row);
        });
    }

    function updateGlobalStats() {
        let totalPossible = 0;
        habits.forEach(habit => {
            for (let d = 1; d <= daysInMonth; d++) {
                const dateObj = new Date(currentYear, currentMonth, d);
                if (isHabitScheduledToday(habit, dateObj.getDay())) totalPossible++;
            }
        });

        const totalCompleted = habitLogs.filter(log => log.completed).length;
        const percentage = totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;

        globalProgressPercentEl.textContent = `${percentage.toFixed(2)}%`;
        globalProgressBarEl.style.width = `${percentage}%`;
        totalCompletedTextEl.textContent = totalCompleted;
        
        saveData();
        if (chart) updateChart();
    }

    // --- Logic ---
    window.toggleHabit = (habitId, date, isChecked) => {
        const logIndex = habitLogs.findIndex(log => log.habitId === habitId && log.date === date);
        
        if (logIndex > -1) {
            habitLogs[logIndex].completed = isChecked;
        } else {
            habitLogs.push({ habitId, date, completed: isChecked });
        }
        
        updateGlobalStats();
        renderAnalytics();
        renderHabits(); // Update streaks
    };

    function calculateStreak(habit) {
        let streak = 0;
        let d = new Date(now);
        d.setHours(0,0,0,0);

        while (true) {
            const dayOfWeek = d.getDay();
            const isScheduled = isHabitScheduledToday(habit, dayOfWeek);
            const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
            
            if (isScheduled) {
                const log = habitLogs.find(log => log.habitId === habit.id && log.date === dateKey);
                if (log && log.completed) {
                    streak++;
                } else {
                    if (d.getTime() === new Date().setHours(0,0,0,0)) {
                        // Skip today if not done yet
                    } else {
                        break;
                    }
                }
            }
            d.setDate(d.getDate() - 1);
            if (streak > 365) break; 
        }
        return streak;
    }

    function saveData() {
        localStorage.setItem('habits', JSON.stringify(habits));
        localStorage.setItem('habitLogs', JSON.stringify(habitLogs));
    }

    // --- Modal Functions ---
    addHabitBtn.onclick = () => {
        currentEditingHabitId = null;
        modalTitle.textContent = 'Add New Habit';
        habitNameInput.value = '';
        habitFrequencyInput.value = 'daily';
        weekdaySelector.style.display = 'none';
        dayButtons.forEach(btn => btn.classList.remove('active'));
        deleteHabitBtn.style.display = 'none';
        habitModal.style.display = 'flex';
    };

    window.editHabit = (id) => {
        const habit = habits.find(h => h.id === id);
        currentEditingHabitId = id;
        modalTitle.textContent = 'Edit Habit';
        habitNameInput.value = habit.name;
        habitFrequencyInput.value = habit.frequency || 'daily';
        
        if (habit.frequency === 'custom') {
            weekdaySelector.style.display = 'block';
            dayButtons.forEach(btn => {
                const day = parseInt(btn.getAttribute('data-day'));
                if (habit.selectedDays && habit.selectedDays.includes(day)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        } else {
            weekdaySelector.style.display = 'none';
            dayButtons.forEach(btn => btn.classList.remove('active'));
        }

        deleteHabitBtn.style.display = 'block';
        habitModal.style.display = 'flex';
    };

    saveHabitBtn.onclick = () => {
        const name = habitNameInput.value.trim();
        const frequency = habitFrequencyInput.value;
        if (!name) return;

        let selectedDays = [];
        if (frequency === 'custom') {
            dayButtons.forEach(btn => {
                if (btn.classList.contains('active')) {
                    selectedDays.push(parseInt(btn.getAttribute('data-day')));
                }
            });
            if (selectedDays.length === 0) {
                alert('Please select at least one day for custom frequency!');
                return;
            }
        }

        if (currentEditingHabitId) {
            const habit = habits.find(h => h.id === currentEditingHabitId);
            habit.name = name;
            habit.frequency = frequency;
            habit.selectedDays = selectedDays;
        } else {
            habits.push({ 
                id: Date.now(), 
                name, 
                goal: 30, 
                frequency,
                selectedDays
            });
        }

        saveData();
        init();
        habitModal.style.display = 'none';
    };

    deleteHabitBtn.onclick = () => {
        if (!currentEditingHabitId) return;
        habits = habits.filter(h => h.id !== currentEditingHabitId);
        habitLogs = habitLogs.filter(l => l.habitId !== currentEditingHabitId);
        saveData();
        init();
        habitModal.style.display = 'none';
    };

    closeModalBtn.onclick = () => {
        habitModal.style.display = 'none';
    };

    // --- Chart ---
    function initChart() {
        const ctx = document.getElementById('progressChart').getContext('2d');
        const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Completion %',
                    data: getDailyData(),
                    borderColor: '#ff007c',
                    backgroundColor: 'rgba(255, 0, 124, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { display: false } }
                }
            }
        });
    }

    function getDailyData() {
        const data = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${currentYear}-${currentMonth + 1}-${day}`;
            const completedToday = habitLogs.filter(log => log.date === dateKey && log.completed).length;
            const percentage = habits.length > 0 ? (completedToday / habits.length) * 100 : 0;
            data.push(percentage);
        }
        return data;
    }

    function updateChart() {
        chart.data.datasets[0].data = getDailyData();
        chart.update();
    }

    // --- Theme ---
    function setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        themeToggle.onclick = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Update chart colors if theme changes
            if (chart) {
                const isDark = newTheme === 'dark';
                chart.options.scales.y.ticks.color = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
                chart.options.scales.x.ticks.color = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
                chart.options.scales.y.grid.color = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                chart.update();
            }
        };
    }

    init();
});
