const BOT_TOKEN = "7918430423:AAFPKEfOzZqmggP6nRMNZIPxG_ivXi4y41U";
const ADMIN_ID = "702501770";

// Справочник Telegram-аккаунтов для автоматического тегирования исполнителей
const tgUsernames = {
    "Женя Борода": "@Happiness091",
    "Влад": "@free8from",
    "Ник": "@fyrfyrmoscow",
    "Никита": "@Shmn32",
    "Алёна Грибова": "@alionagrib",
    "Нася You": "@youjwllr",
    "Натали": "@ntlngvtsn"
};

document.addEventListener("DOMContentLoaded", function() {
    const isAdminPage = window.location.pathname.includes('admin.html');

    if (isAdminPage) {
        // Загрузка глобального расписания для всей команды
        loadGlobalSchedule();
    } else {
        // Логика формы заказа
        initCalendar();
        initFormWithBackup();
    }
});

// --- ЗАЩИТА ОТ СБОЕВ: АВТОСОХРАНЕНИЕ ЧЕРНОВИКА ФОРМЫ ---
function initFormWithBackup() {
    const fields = ['duration', 'usernameSelect', 'comment', 'customUsername'];
    
    fields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el && localStorage.getItem(`zavod_backup_${fieldId}`)) {
            el.value = localStorage.getItem(`zavod_backup_${fieldId}`);
        }
        el?.addEventListener('input', () => localStorage.setItem(`zavod_backup_${fieldId}`, el.value));
        el?.addEventListener('change', () => localStorage.setItem(`zavod_backup_${fieldId}`, el.value));
    });

    const usernameSelect = document.getElementById('usernameSelect');
    const customUsernameInput = document.getElementById('customUsername');
    
    if (usernameSelect) {
        if (usernameSelect.value === 'Иначе') customUsernameInput.style.display = 'block';
        
        usernameSelect.addEventListener('change', function() {
            if (this.value === 'Иначе') {
                customUsernameInput.style.display = 'block';
                customUsernameInput.required = true;
            } else {
                customUsernameInput.style.display = 'none';
                customUsernameInput.required = false;
                customUsernameInput.value = '';
                localStorage.removeItem('zavod_backup_customUsername');
            }
        });
    }

    document.getElementById('fileInput')?.addEventListener('change', function() {
        const preview = document.getElementById('file-name-preview');
        if (this.files.length > 0) preview.textContent = `📎 Файл прикреплен сообщением: ${this.files[0].name}`;
    });

    document.getElementById('orderForm')?.addEventListener('submit', handleFormSubmit);
}

// --- ОТПРАВКА ЗАЯВКИ С ТЕГОМ ЮЗЕРА ЧЕРЕЗ TELEGRAM ---
async function handleFormSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMessage');

    const tech = document.querySelector('input[name="tech"]:checked').value;
    const rawDate = document.getElementById('date').value;
    const duration = document.getElementById('duration').value;
    const comment = document.getElementById('comment').value;
    const fileInput = document.getElementById('fileInput');

    let selectedName = usernameSelect.value;
    let finalUsername = selectedName === 'Иначе' ? customUsernameInput.value.trim() : (tgUsernames[selectedName] || selectedName);

    // Контроль дедлайна в 16:00
    const currentHour = new Date().getHours();
    const isNik = (finalUsername === '@fyrfyrmoscow' || selectedName === 'Ник');

    if (currentHour >= 16 && !isNik) {
        statusMsg.className = "status-msg error";
        statusMsg.textContent = "🛑 Время вышло. После 16:00 заявки принимает только Ник.";
        return;
    }

    submitBtn.disabled = true;
    statusMsg.className = "status-msg";
    statusMsg.textContent = "Публикация ТЗ в глобальный график...";

    const formattedDate = rawDate.split('-').reverse().join('.');

    // Маркер-тег в начале, чтобы страница админа понимала, что это именно заявка
    const messageText = `#ZAVOD_TASK\n📋 **НОВАЯ ЗАЯВКА НА ТЕХНИКУ**\n━━━━━━━━━━━━━━━\n⚙️ **Техника:** ${tech}\n📅 **Когда:** ${formattedDate}\n⏳ **Время:** ${duration}\n👤 **Заказчик/Исполнитель:** ${finalUsername}\n━━━━━━━━━━━━━━━\n📝 **Техническое задание:**\n${comment}`;

    try {
        let response;
        if (fileInput && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('chat_id', ADMIN_ID);
            formData.append('document', fileInput.files[0]);
            formData.append('caption', messageText);
            formData.append('parse_mode', 'Markdown');
            response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: 'POST', body: formData });
        } else {
            response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: ADMIN_ID, text: messageText, parse_mode: 'Markdown' })
            });
        }

        if (response.ok) {
            statusMsg.className = "status-msg success";
            statusMsg.textContent = "✅ Заявка улетела в общий график!";
            
            ['duration', 'comment', 'customUsername'].forEach(id => localStorage.removeItem(`zavod_backup_${id}`));
            document.getElementById('orderForm').reset();
            if (document.getElementById('file-name-preview')) document.getElementById('file-name-preview').textContent = '';
            initCalendar();
        } else {
            throw new Error();
        }
    } catch (error) {
        statusMsg.className = "status-msg error";
        statusMsg.textContent = "❌ Ошибка сети. Для отправки в Телеграм включи VPN.";
    } finally {
        submitBtn.disabled = false;
    }
}

// --- ЧТЕНИЕ ГЛОБАЛЬНОГО ГРАФИКА ИЗ ТЕЛЕГРАМА ДЛЯ ВСЕХ УСТРОЙСТВ ---
async function loadGlobalSchedule() {
    const container = document.getElementById('tasksContainer');
    try {
        // Запрашиваем историю обновлений бота (последние 100 сообщений)
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=100&allowed_updates=["message"]`);
        if (!response.ok) throw new Error();
        
        const data = await response.json();
        let updates = data.result || [];
        
        let globalTasks = [];

        updates.forEach(u => {
            let msg = u.message || u.channel_post;
            if (!msg) return;
            
            let text = msg.text || msg.caption || "";
            
            // Фильтруем только сообщения нашего сервиса задач
            if (text.includes('#ZAVOD_TASK')) {
                // Парсим текст регулярными выражениями, вытаскивая чистые данные для карточек
                let techMatch = text.match(/⚙️ \*\*Техника:\*\* (.+)/);
                let dateMatch = text.match(/📅 \*\*Когда:\*\* (.+)/);
                let durationMatch = text.match(/⏳ \*\*Время:\*\* (.+)/);
                let userMatch = text.match(/👤 \*\*Заказчик\/Исполнитель:\*\* (.+)/);
                let commentMatch = text.match(/📝 \*\*Техническое задание:\*\*\n([\s\S]+)/);

                if (techMatch && dateMatch) {
                    globalTasks.push({
                        tech: techMatch[1].trim(),
                        date: dateMatch[1].trim(),
                        duration: durationMatch ? durationMatch[1].trim() : "",
                        username: userMatch ? userMatch[1].trim() : "Не указан",
                        comment: commentMatch ? commentMatch[1].trim() : "",
                        timestamp: msg.date * 1000
                    });
                }
            }
        });

        // Сортируем: свежие сверху
        globalTasks.sort((a, b) => b.timestamp - a.timestamp);
        window.zavodGlobalTasks = globalTasks;

        // Рендерим дефолтную вкладку "Сегодня"
        renderPrimitiveTasks('today');

    } catch (e) {
        if (container) container.innerHTML = '<p class="no-tasks">⚠️ Ошибка синхронизации глобального графика. Попробуй включить VPN.</p>';
    }
}

function renderPrimitiveTasks(period) {
    const container = document.getElementById('tasksContainer');
    if (!container || !window.zavodGlobalTasks) return;
    container.innerHTML = '';

    const todayStr = getFormattedDate(0);
    const tomorrowStr = getFormattedDate(1);
    let filtered = [];

    if (period === 'today') filtered = window.zavodGlobalTasks.filter(t => t.date === todayStr);
    else if (period === 'tomorrow') filtered = window.zavodGlobalTasks.filter(t => t.date === tomorrowStr);
    else if (period === 'week') {
        const weekDates = [];
        for(let i = 0; i < 7; i++) weekDates.push(getFormattedDate(i));
        filtered = window.zavodGlobalTasks.filter(t => weekDates.includes(t.date));
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-tasks">На этот период в глобальном графике нет задач</p>';
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
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderPrimitiveTasks(this.dataset.period);
        });
    });
}

function getFormattedDate(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    let dd = d.getDate(), mm = d.getMonth() + 1;
    if (dd < 10) dd = '0' + dd; if (mm < 10) mm = '0' + mm;
    return `${dd}.${mm}.${d.getFullYear()}`;
}

function initCalendar() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date();
        let dd = today.getDate(), mm = today.getMonth() + 1;
        if (dd < 10) dd = '0' + dd; if (mm < 10) mm = '0' + mm;
        dateInput.value = `${today.getFullYear()}-${mm}-${dd}`;
        dateInput.min = dateInput.value;
    }
}
