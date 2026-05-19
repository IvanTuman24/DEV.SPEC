const BOT_TOKEN = "7918430423:AAFPKEfOzZqmggP6nRMNZIPxG_ivXi4y41U";
const ADMIN_ID = "702501770";

// Глобальная синхронизируемая онлайн-база данных (доступна со всех устройств в мире)
const GLOBAL_DB_URL = "https://kvdb.io/MN98VfD6vQpYtWn6S6q7Z9/zavod_tech_schedule";

const tgUsernames = {
    "Женя Борода": "@Happiness091",
    "Влад": "@free8from",
    "Ник": "@fyrfyrmoscow",
    "Никита": "@Shmn32",
    "Алёна Грибова": "@alionagrib",
    "Нася You": "@youjwllr",
    "Натали": "@ntlngvtsn"
};

let localTasks = [];

document.addEventListener("DOMContentLoaded", async function() {
    const isAdminPage = window.location.pathname.includes('admin.html');

    if (isAdminPage) {
        // Логика для любого устройства, открывшего страницу графика расписания
        await loadTasksFromGlobalCloud();
        renderTasks('today');
        initFilterButtons();
    } else {
        // Логика для страницы отправки формы
        initCalendar();
        initFormLogic();
    }
});

// --- СЕТЕВАЯ СИНХРОНИЗАЦИЯ С ГЛОБАЛЬНЫМ ХРАНИЛИЩЕМ ---
async function loadTasksFromGlobalCloud() {
    try {
        const response = await fetch(GLOBAL_DB_URL);
        if (response.ok) {
            localTasks = await response.json();
            // Сортировка: самые свежие добавленные заявки всегда вверху списка
            localTasks.sort((a, b) => b.timestamp - a.timestamp);
        } else {
            localTasks = [];
        }
    } catch (e) {
        console.log("Глобальная база пуста или инициализируется.");
        localTasks = [];
    }
}

async function saveTasksToGlobalCloud() {
    try {
        await fetch(GLOBAL_DB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localTasks)
        });
    } catch (e) {
        console.error("Критическая ошибка синхронизации с глобальной базой:", e);
    }
}

// --- ОТРИСОВКА ПРИМИТИВНОГО ГРАФИКА ЗАДАЧ (СВЕРХУ ВНИЗ) ---
function renderTasks(period) {
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    
    container.innerHTML = '';

    const todayStr = getFormattedDate(0);
    const tomorrowStr = getFormattedDate(1);
    let filtered = [];

    if (period === 'today') {
        filtered = localTasks.filter(t => t.date === todayStr);
    } else if (period === 'tomorrow') {
        filtered = localTasks.filter(t => t.date === tomorrowStr);
    } else if (period === 'week') {
        const weekDates = [];
        for(let i = 0; i < 7; i++) weekDates.push(getFormattedDate(i));
        filtered = localTasks.filter(t => weekDates.includes(t.date));
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-tasks">Нет запланированных задач на этот период</p>';
        return;
    }

    filtered.forEach(task => {
        const item = document.createElement('div');
        item.className = 'task-item';
        item.innerHTML = `
            <div class="task-item-header">
                <span class="task-item-tech">${task.tech}</span>
                <span class="task-item-user">${task.username}</span>
            </div>
            <div class="task-item-duration">⏳ Срок: ${task.date} — ${task.duration}</div>
            <div class="task-item-comment">${task.comment}</div>
        `;
        container.appendChild(item);
    });
}

function initFilterButtons() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderTasks(this.dataset.period);
        });
    });
}

function getFormattedDate(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    let dd = d.getDate();
    let mm = d.getMonth() + 1;
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    return `${dd}.${mm}.${d.getFullYear()}`;
}

// --- ЛОГИКА ФОРМЫ ЗАЯВОК ---
function initCalendar() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        let mm = today.getMonth() + 1; 
        let dd = today.getDate();
        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;
        const formattedToday = `${yyyy}-${mm}-${dd}`;
        dateInput.value = formattedToday; 
        dateInput.min = formattedToday;   
    }
}

function initFormLogic() {
    const usernameSelect = document.getElementById('usernameSelect');
    const customUsernameInput = document.getElementById('customUsername');
    const fileInput = document.getElementById('fileInput');
    const orderForm = document.getElementById('orderForm');

    if (usernameSelect) {
        usernameSelect.addEventListener('change', function() {
            if (this.value === 'Иначе') {
                customUsernameInput.style.display = 'block';
                customUsernameInput.required = true;
            } else {
                customUsernameInput.style.display = 'none';
                customUsernameInput.required = false;
                customUsernameInput.value = ''; 
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const preview = document.getElementById('file-name-preview');
            if (this.files.length > 0) preview.textContent = `📎 Выбран файл: ${this.files[0].name}`;
            else preview.textContent = '';
        });
    }

    if (orderForm) {
        orderForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = document.getElementById('submitBtn');
            const statusMsg = document.getElementById('statusMessage');

            const tech = document.querySelector('input[name="tech"]:checked').value;
            const rawDate = document.getElementById('date').value;
            const duration = document.getElementById('duration').value;
            const comment = document.getElementById('comment').value;

            let selectedName = usernameSelect.value;
            let finalUsername = selectedName === 'Иначе' ? customUsernameInput.value.trim() : (tgUsernames[selectedName] || selectedName);

            // ПРОВЕРКА ВРЕМЕНИ ДЛЯ НИКА (16:00)
            const currentHour = new Date().getHours();
            const isNik = (finalUsername === '@fyrfyrmoscow' || selectedName === 'Ник');

            if (currentHour >= 16 && !isNik) {
                statusMsg.className = "status-msg error";
                statusMsg.textContent = "🛑 Время вышло. После 16:00 заявки принимает только Ник.";
                return;
            }

            submitBtn.disabled = true;
            statusMsg.className = "status-msg";
            statusMsg.textContent = "Синхронизация с глобальным графиком...";

            const formattedDate = rawDate.split('-').reverse().join('.');

            // 1. Скачиваем текущую глобальную базу, чтобы не стереть чужие ТЗ
            await loadTasksFromGlobalCloud();

            // 2. Дописываем новую задачу в общий массив
            const newTask = {
                tech,
                date: formattedDate,
                duration,
                username: finalUsername,
                comment,
                timestamp: Date.now()
            };
            localTasks.push(newTask);

            // 3. Выгружаем обратно в глобальную сеть
            await saveTasksToGlobalCloud();

            const messageText = `📋 НОВАЯ ЗАЯВКА НА ТЕХНИКУ\n━━━━━━━━━━━━━━━\n⚙️ Техника: ${tech}\n📅 Когда: ${formattedDate}\n⏳ Время: ${duration}\n👤 Заказчик: ${finalUsername}\n━━━━━━━━━━━━━━━\n📝 ТЗ успешно зафиксировано в общем графике расписания.`;

            try {
                let response;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                if (fileInput && fileInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('chat_id', ADMIN_ID);
                    formData.append('document', fileInput.files[0]);
                    formData.append('caption', messageText);
                    response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: 'POST', body: formData, signal: controller.signal });
                } else {
                    response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: ADMIN_ID, text: messageText }),
                        signal: controller.signal
                    });
                }

                clearTimeout(timeoutId);
                if (!response.ok) throw new Error('Ошибка Telegram API');

                statusMsg.className = "status-msg success";
                statusMsg.textContent = "✅ Задача занесена в глобальный график расписания!";
                orderForm.reset();
                if (document.getElementById('file-name-preview')) document.getElementById('file-name-preview').textContent = '';
                customUsernameInput.style.display = 'none';
                initCalendar();

            } catch (error) {
                // Если Telegram заблокирован без VPN, в глобальную базу на сайте данные всё равно успешно запишутся!
                statusMsg.className = "status-msg success";
                statusMsg.textContent = "✅ Внесено в общий график! (ТГ-уведомление не отправлено, включите VPN).";
            } finally {
                submitBtn.disabled = false;
            }
        });
    }
}
