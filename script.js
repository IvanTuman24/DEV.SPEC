const BOT_TOKEN = "7918430423:AAFPKEfOzZqmggP6nRMNZIPxG_ivXi4y41U";
const ADMIN_ID = "702501770";

// Справочник Telegram-аккаунтов для автоматического тегирования исполнителей в ТЗ
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
        renderLocalTasks('today');
        initFilterButtons();
    } else {
        initCalendar();
        initFormWithBackup();
    }
});

// --- ЗАЩИТА ОТ СБОЕВ: АВТОСОХРАНЕНИЕ ЧЕРНОВИКА ФОРМЫ ---
function initFormWithBackup() {
    const fields = ['duration', 'usernameSelect', 'comment', 'customUsername'];
    
    // Восстанавливаем данные из локального кэша смартфона после перезагрузки или сбоя
    fields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el && localStorage.getItem(`zavod_backup_${fieldId}`)) {
            el.value = localStorage.getItem(`zavod_backup_${fieldId}`);
        }
        // Запоминаем каждое изменение на лету
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

    // Обработка превью прикрепляемого файла
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

    // Контроль жесткого дедлайна в 16:00 (Ник — исключение)
    const currentHour = new Date().getHours();
    const isNik = (finalUsername === '@fyrfyrmoscow' || selectedName === 'Ник');

    if (currentHour >= 16 && !isNik) {
        statusMsg.className = "status-msg error";
        statusMsg.textContent = "🛑 Время вышло. После 16:00 заявки принимает только Ник.";
        return;
    }

    submitBtn.disabled = true;
    statusMsg.className = "status-msg";
    statusMsg.textContent = "Формирование ТЗ и отправка в Telegram...";

    const formattedDate = rawDate.split('-').reverse().join('.');

    // Сохраняем задачу локально для текущего устройства
    const newTask = { tech, date: formattedDate, duration, username: finalUsername, comment, timestamp: Date.now() };
    let localSchedule = JSON.parse(localStorage.getItem('zavod_local_schedule') || '[]');
    localSchedule.push(newTask);
    localStorage.setItem('zavod_local_schedule', JSON.stringify(localSchedule));

    // Сборка текста ТЗ с автоматическим тегом исполнителя
    const messageText = `📋 **НОВАЯ ЗАЯВКА НА ТЕХНИКУ**\n━━━━━━━━━━━━━━━\n⚙️ **Техника:** ${tech}\n📅 **Когда:** ${formattedDate}\n⏳ **Время:** ${duration}\n👤 **Заказчик/Исполнитель:** ${finalUsername}\n━━━━━━━━━━━━━━━\n📝 **Техническое задание:**\n${comment}`;

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
            statusMsg.textContent = "✅ Заявка улетела исполнителю в Telegram!";
            
            // Очищаем черновики после успешного улета
            ['duration', 'comment', 'customUsername'].forEach(id => localStorage.removeItem(`zavod_backup_${id}`));
            document.getElementById('orderForm').reset();
            if (document.getElementById('file-name-preview')) document.getElementById('file-name-preview').textContent = '';
            initCalendar();
        } else {
            throw new Error("Ошибка сервера Telegram");
        }

    } catch (error) {
        statusMsg.className = "status-msg error";
        statusMsg.textContent = "❌ Ошибка сети. Проверь VPN или подключение к интернету.";
    } finally {
        submitBtn.disabled = false;
    }
}

// --- ОТРИСОВКА КАРТОЧЕК В РАСПИСАНИИ ---
function renderLocalTasks(period) {
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    container.innerHTML = '';

    const todayStr = getFormattedDate(0);
    const tomorrowStr = getFormattedDate(1);
    
    let localSchedule = JSON.parse(localStorage.getItem('zavod_local_schedule') || '[]');
    localSchedule.sort((a, b) => b.timestamp - a.timestamp);
    
    let filtered = [];

    if (period === 'today') filtered = localSchedule.filter(t => t.date === todayStr);
    else if (period === 'tomorrow') filtered = localSchedule.filter(t => t.date === tomorrowStr);
    else if (period === 'week') {
        const weekDates = [];
        for(let i = 0; i < 7; i++) weekDates.push(getFormattedDate(i));
        filtered = localSchedule.filter(t => weekDates.includes(t.date));
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-tasks">В графике нет запланированных задач на этот период</p>';
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
            <div class="task-item-duration">📅 Дата: ${task.date} (${task.duration})</div>
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
            renderLocalTasks(this.dataset.period);
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

// Установка календаря на текущую дату
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
