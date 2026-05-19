const BOT_TOKEN = "7918430423:AAFPKEfOzZqmggP6nRMNZIPxG_ivXi4y41U";
const ADMIN_ID = "702501770";

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
        // Логика для любого устройства, зашедшего на расписание
        await loadTasksFromTelegramLogs();
        renderTasks('today');
        initFilterButtons();
    } else {
        initCalendar();
        initFormLogic();
    }
});

// --- ГЛОБАЛЬНОЕ ЧТЕНИЕ ИЗ ТЕЛЕГРАМА (ДЛЯ ВСЕХ УСТРОЙСТВ) ---
async function loadTasksFromTelegramLogs() {
    const container = document.getElementById('tasksContainer');
    try {
        // Запрашиваем у Телеграма последние 50 сообщений из нашего рабочего чата/канала
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-50&allowed_updates=["message"]`);
        
        if (response.ok) {
            const data = await response.json();
            const updates = data.result || [];
            
            localTasks = [];
            
            updates.forEach(upd => {
                // Ищем текстовые сообщения или подписи к документам, содержащие ключевую фразу ТЗ
                let text = "";
                if (upd.message && upd.message.text) text = upd.message.text;
                if (upd.message && upd.message.caption) text = upd.message.caption;
                
                if (text.includes("📋 НОВАЯ ЗАЯВКА НА ТЕХНИКУ")) {
                    parseAndAddTelegramTask(text, upd.message.date * 1000);
                }
            });

            // Сортируем: свежие ТЗ всегда вверху
            localTasks.sort((a, b) => b.timestamp - a.timestamp);
        }
    } catch (e) {
        console.error("Ошибка чтения логов Telegram:", e);
    }
}

// Извлекаем чистые данные из текстовой карточки Телеграма
function parseAndAddTelegramTask(text, msgTimestamp) {
    try {
        const lines = text.split("\n");
        let tech = "🚜 Техника";
        let date = "";
        let duration = "";
        let username = "";
        let commentLines = [];
        let isCommentZone = false;

        lines.forEach(line => {
            if (line.includes("⚙️ Техника:")) tech = line.split("Техника:")[-1].trim().replace(/\*/g, "");
            if (line.includes("📅 Когда:")) date = line.split("Когда:")[-1].strip().replace(/\*/g, "");
            if (line.includes("⏳ На сколько:") || line.includes("⏳ Время:")) duration = line.split(":")[-1].trim().replace(/\*/g, "");
            if (line.includes("👤 Заказчик:")) username = line.split("Заказчик:")[-1].trim().replace(/\*/g, "");
            
            if (isCommentZone) {
                commentLines.push(line);
            }
            if (line.includes("📝 Задача и ТЗ:")) {
                isCommentZone = true;
            }
        });

        // Собираем ТЗ обратно в текст
        let comment = commentLines.join("\n").trim();

        if (date) {
            localTasks.push({
                tech,
                date, // Уже в формате ДД.ММ.ГГГГ
                duration,
                username,
                comment,
                timestamp: msgTimestamp
            });
        }
    } catch (err) {
        console.log("Ошибка парсинга отдельной карточки", err);
    }
}

// --- ОТРИСОВКА ПРИМИТИВНОГО ГРАФИКА ЗАДАЧ ---
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

            const currentHour = new Date().getHours();
            const isNik = (finalUsername === '@fyrfyrmoscow' || selectedName === 'Ник');

            if (currentHour >= 16 && !isNik) {
                statusMsg.className = "status-msg error";
                statusMsg.textContent = "🛑 Время вышло. После 16:00 заявки принимает только Ник.";
                return;
            }

            submitBtn.disabled = true;
            statusMsg.className = "status-msg";
            statusMsg.textContent = "Синхронизация с графиком и отправка...";

            const formattedDate = rawDate.split('-').reverse().join('.');

            const messageText = `📋 **НОВАЯ ЗАЯВКА НА ТЕХНИКУ**\n━━━━━━━━━━━━━━━\n⚙️ **Техника:** ${tech}\n📅 **Когда:** ${formattedDate}\n⏳ **На сколько:** ${duration}\n👤 **Заказчик:** ${finalUsername}\n━━━━━━━━━━━━━━━\n📝 **Задача и ТЗ:**\n${comment}`;

            try {
                let response;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                if (fileInput && fileInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('chat_id', ADMIN_ID);
                    formData.append('document', fileInput.files[0]);
                    formData.append('caption', messageText);
                    formData.append('parse_mode', 'Markdown');
                    response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: 'POST', body: formData, signal: controller.signal });
                } else {
                    response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: ADMIN_ID, text: messageText, parse_mode: 'Markdown' }),
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
                statusMsg.className = "status-msg error";
                statusMsg.textContent = "❌ Ошибка сети. Для отправки заявки включите VPN.";
            } finally {
                submitBtn.disabled = false;
            }
        });
    }
}
