
const habitForm = document.getElementById("habitForm");
const habitName = document.getElementById("habitName");
const habitCategory = document.getElementById("habitCategory");
const selectedDate = document.getElementById("selectedDate");

const habitList = document.getElementById("habitList");
const habitCount = document.getElementById("habitCount");
const emptyMessage = document.getElementById("emptyMessage");

const percentage = document.getElementById("percentage");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const motivation = document.getElementById("motivation");
const dateMessage = document.getElementById("dateMessage");

const monthTitle = document.getElementById("monthTitle");
const calendarGrid = document.getElementById("calendarGrid");

const STORAGE_KEY = "habitFlowData";

// Get today's date in local time.
function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Load saved information from the browser.
function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return { habits: [], progress: {} };
        }

        const data = JSON.parse(saved);

        if (
            !data ||
            !Array.isArray(data.habits) ||
            !data.progress ||
            typeof data.progress !== "object" ||
            Array.isArray(data.progress)
        ) {
            throw new Error("Invalid saved data");
        }

        return data;
    } catch (error) {
        alert("Saved data could not be read. Your old data may be unavailable.");
        return { habits: [], progress: {} };
    }
}

let data = loadData();
let viewedMonth = new Date();
viewedMonth.setDate(1);

// Save all habits and progress.
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        alert("Could not save data. Check your browser storage settings.");
        return false;
    }
}

// Get completed habit IDs for a particular day.
function getCompleted(date) {
    const completed = data.progress[date];

    return Array.isArray(completed) ? completed : [];
}

// Calculate the daily completion percentage.
function getDailyPercentage(date) {
    if (data.habits.length === 0) {
        return 0;
    }

    const completed = getCompleted(date);
    const count = data.habits.filter(
        habit => completed.includes(habit.id)
    ).length;

    return Math.round((count / data.habits.length) * 100);
}

// Create a new habit.
habitForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = habitName.value.trim();

    if (!name) {
        alert("Please enter a habit name.");
        return;
    }

    const habit = {
        id: crypto.randomUUID(),
        name: name,
        category: habitCategory.value,
        createdAt: getToday()
    };

    data.habits.push(habit);

    if (!saveData()) {
        data.habits.pop();
        return;
    }

    habitForm.reset();

    renderHabits();
    renderCalendar();
});

// Mark a habit complete or incomplete.
function toggleHabit(id, checked) {
    const date = selectedDate.value;
    const completed = getCompleted(date);

    const previous = [...completed];

    let updated;

    if (checked) {
        updated = completed.includes(id)
            ? completed
            : [...completed, id];
    } else {
        updated = completed.filter(habitId => habitId !== id);
    }

    data.progress[date] = updated;

    if (!saveData()) {
        data.progress[date] = previous;
        renderHabits();
        return;
    }

    renderHabits();
    renderCalendar();
}

// Delete a habit and its recorded completion history.
function deleteHabit(id) {
    const habit = data.habits.find(item => item.id === id);

    if (!habit) return;

    const confirmed = confirm(
        `Delete "${habit.name}" and its saved progress?`
    );

    if (!confirmed) return;

    const previousHabits = [...data.habits];
    const previousProgress = JSON.parse(JSON.stringify(data.progress));

    data.habits = data.habits.filter(item => item.id !== id);

    for (const date in data.progress) {
        data.progress[date] = getCompleted(date).filter(
            habitId => habitId !== id
        );
    }

    if (!saveData()) {
        data.habits = previousHabits;
        data.progress = previousProgress;
        return;
    }

    renderHabits();
    renderCalendar();
}

// Show all habits for the selected date.
function renderHabits() {
    const date = selectedDate.value;
    const completed = getCompleted(date);

    habitList.replaceChildren();

    habitCount.textContent =
        `${data.habits.length} ${data.habits.length === 1 ? "habit" : "habits"}`;

    emptyMessage.style.display =
        data.habits.length === 0 ? "block" : "none";

    data.habits.forEach(habit => {
        const isDone = completed.includes(habit.id);

        const item = document.createElement("div");
        item.className = "habit-item";

        if (isDone) {
            item.classList.add("completed");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "habit-check";
        checkbox.checked = isDone;
        checkbox.setAttribute(
            "aria-label",
            `Mark ${habit.name} complete`
        );

        // Habits created later do not appear on earlier dates.
        checkbox.disabled = date < habit.createdAt;

        checkbox.addEventListener("change", function () {
            toggleHabit(habit.id, checkbox.checked);
        });

        const details = document.createElement("div");
        details.className = "habit-details";

        const name = document.createElement("div");
        name.className = "habit-name";
        name.textContent = habit.name;

        const category = document.createElement("div");
        category.className = "habit-category";
        category.textContent = habit.category;

        details.append(name, category);

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.type = "button";
        deleteButton.setAttribute(
            "aria-label",
            `Delete ${habit.name}`
        );

        deleteButton.addEventListener("click", function () {
            deleteHabit(habit.id);
        });

        item.append(checkbox, details, deleteButton);
        habitList.appendChild(item);
    });

    updateProgress();
}

// Update the daily percentage and progress bar.
function updateProgress() {
    const date = selectedDate.value;
    const completed = getCompleted(date).filter(id =>
        data.habits.some(habit => habit.id === id)
    );

    const count = completed.length;
    const total = data.habits.length;
    const percent = getDailyPercentage(date);

    percentage.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;

    progressText.textContent = `${count} of ${total} habits completed`;

    if (total === 0) {
        motivation.textContent = "Add your first habit to get started! 🌱";
    } else if (percent === 100) {
        motivation.textContent = "Amazing! You completed every habit today! 🎉";
    } else if (percent >= 70) {
        motivation.textContent = "Great progress! Keep going! 💪";
    } else if (percent >= 30) {
        motivation.textContent = "You're making progress. One more step! 🌿";
    } else {
        motivation.textContent = "Start small. Every completed habit counts! ✨";
    }

    if (date === getToday()) {
        dateMessage.textContent = "Tracking today's habits.";
    } else if (date < getToday()) {
        dateMessage.textContent = "Viewing your past progress.";
    } else {
        dateMessage.textContent = "Viewing a future date.";
    }
}

// Change the selected date.
selectedDate.addEventListener("change", function () {
    if (!selectedDate.value) {
        selectedDate.value = getToday();
    }

    const date = new Date(selectedDate.value + "T12:00:00");

    viewedMonth = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
    );

    renderHabits();
    renderCalendar();
});

// Display the monthly calendar.
function renderCalendar() {
    const year = viewedMonth.getFullYear();
    const month = viewedMonth.getMonth();

    monthTitle.textContent = viewedMonth.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
    );

    calendarGrid.replaceChildren();

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    weekdays.forEach(day => {
        const label = document.createElement("div");
        label.className = "calendar-weekday";
        label.textContent = day;
        calendarGrid.appendChild(label);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Blank spaces before the first day of the month.
    for (let i = 0; i < firstDay; i++) {
        const blank = document.createElement("div");
        blank.className = "calendar-day empty";
        blank.setAttribute("aria-hidden", "true");
        calendarGrid.appendChild(blank);
    }

    // Display each date.
    for (let day = 1; day <= daysInMonth; day++) {
        const date =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "calendar-day";

        const dayNumber = document.createElement("span");
        dayNumber.className = "day-number";
        dayNumber.textContent = day;

        const dayPercent = document.createElement("span");
        dayPercent.className = "day-percent";

        const hasHabits = data.habits.some(
            habit => habit.createdAt <= date
        );

        const completed = getCompleted(date).filter(id =>
            data.habits.some(
                habit => habit.id === id && habit.createdAt <= date
            )
        );

        const total = data.habits.filter(
            habit => habit.createdAt <= date
        ).length;

        const percent = total > 0
            ? Math.round((completed.length / total) * 100)
            : 0;

        if (hasHabits && date <= getToday()) {
            dayPercent.textContent = `${percent}%`;

            if (percent === 100) {
                button.classList.add("complete");
            } else if (percent > 0) {
                button.classList.add("partial");
            } else {
                button.classList.add("no-progress");
            }
        } else if (hasHabits) {
            dayPercent.textContent = "—";
        } else {
            dayPercent.textContent = "—";
        }

        if (date === getToday()) {
            button.classList.add("today");
            button.title = "Today";
        }

        if (date === selectedDate.value) {
            button.classList.add("selected");
            button.setAttribute("aria-pressed", "true");
        } else {
            button.setAttribute("aria-pressed", "false");
        }

        button.setAttribute(
            "aria-label",
            `${date}, ${total > 0 ? percent + "% complete" : "no habits"}`
        );

        button.append(dayNumber, dayPercent);

        button.addEventListener("click", function () {
            selectedDate.value = date;
            renderHabits();
            renderCalendar();
        });

        calendarGrid.appendChild(button);
    }
}

// Previous and next month buttons.
document.getElementById("prevMonth").addEventListener("click", function () {
    viewedMonth.setMonth(viewedMonth.getMonth() - 1);
    renderCalendar();
});

document.getElementById("nextMonth").addEventListener("click", function () {
    viewedMonth.setMonth(viewedMonth.getMonth() + 1);
    renderCalendar();
});

// Start the application.
selectedDate.value = getToday();

renderHabits();
renderCalendar();
