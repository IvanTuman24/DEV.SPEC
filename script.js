const BOT_TOKEN = "7918430423:AAFPKEfOzZqmggP6nRMNZIPxG_ivXi4y41U";
const ADMIN_ID = "702501770";

// Глобальная открытая база для графиков (работает везде без VPN)
const SCHEDULE_DB_URL = "https://api.jsonbin.io/v3/b/657ed926dc746540188448b1";
const MASTER_KEY = "$2a$10$X86Z9967N4XG97b7K89B7Oux9T7mEunpPqgKx2wzG5kX1v52WmuX6";

const tgUsernames = {
    "Женя Борода": "@Happiness091",
    "Влад": "@free8from",
    "Ник": "@fyrfyrmoscow",
    "Никита": "@Shmn32",
    "Алёна Грибова": "@alionagrib",
    "Нася You": "@youjwllr",
    "Натали": "@ntlngvtsn"
};

let globalTasks = [];

document.addEventListener("DOMContentLoaded", async function() {
    const isAdminPage = window.location.pathname.includes('admin.html');

    if (isAdminPage) {
        // Подгружаем базу и выводим всё подряд
        await loadGlobalSchedule();
        renderAllTasksPlain();
    } else {
        initCalendar();
        initFormWithBackup();
    }
});

// --- ЗАЩИТА ОТ СБОЕВ: АВТОСОХРАНЕНИЕ ЧЕРНОВИКА ФОРМЫ ---
function initFormWithBackup() {
    const fields = ['duration', 'usernameSelect', 'comment', 'customUsername'];
    
    fields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el && localStorage.getItem(`zavod_form_backup_${fieldId}`)) {
            el.value = localStorage.getItem(`zavod_form_backup_${fieldId}`);
        }
        el?.addEventListener('input', () => localStorage.setItem(`zavod_form_backup_${fieldId}`, el.value));
        el?.addEventListener('change', () => localStorage.setItem(`zavod_form_backup_${fieldId}`, el.value));
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
                localStorage.removeItem('zavod_form_backup_customUsername');
            }
        });
    }

    document.getElementById('fileInput')?.addEventListener('change', function() {
        const preview = document.getElementById('file-name-preview');
        if (this.files.length > 0) preview.textContent = `📎 Файл готов: ${this.files[0].name}`;
    });

    document.getElementById('orderForm')?.addEventListener('submit', handleFormSubmit);
}

// --- ОТПРАВКА С ДВОЙНОЙ ЗАПИСЬЮ (БАЗА + ТГ С ТЕГОМ) ---
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

    const currentHour = new Date().getHours();
    const isNik = (finalUsername === '@fyrfyrmoscow' || selectedName === 'Ник');

    if (currentHour >= 16 && !isNik) {
        statusMsg.className = "status-msg error";
        statusMsg.textContent = "🛑 Время вышло. После 16:00 заявки принимает только Ник.";
        return;
    }

    submitBtn.disabled = true;
    statusMsg.className = "status-msg";
    statusMsg.textContent = "Внесение ТЗ в общий список...";

    const formattedDate = rawDate.split('-').reverse().join('.');

    // 1. ПИШЕМ ЗАДАЧУ В ОБЛАКО ДЛЯ СТРАНИЦЫ АДМИНА
    await loadGlobalSchedule();
    const newTask = { tech, date: formattedDate, duration, username: finalUsername, comment, timestamp: Date.now() };
    globalTasks.push(newTask);
    await saveGlobalSchedule();

    // 2. ОТПРАВЛЯЕМ ТЗ СООБЩЕНИЕМ В ТЕЛЕГРАМ С ТЕГОМ
    const messageText = `📋 **НОВАЯ ЗАЯВКА НА ТЕХНИКУ**\n━━━━━━━━━━━━━━━\n⚙️ **Техника:** ${tech}\n📅 **Когда:** ${formattedDate}\n⏳ **Время:** ${duration}\n👤 **Заказчик/Исполнитель:** ${finalUsername}\n━━━━━━━━━━━━━━━\n📝 **Техническое задание:**\n${comment}`;

    try {
        if (fileInput && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('chat_id', ADMIN_ID);
            formData.append('document', fileInput.files[0]);
            formData.append('caption', messageText);
            formData.append('parse_mode', 'Markdown');
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: 'POST', body: formData });
        } else {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: ADMIN_ID, text: messageText, parse_mode: 'Markdown' })
            });
        }
        statusMsg.className = "status-msg success";
        statusMsg.textContent = "✅ Заявка занесена в общий список и отправлена в ТГ!";
    } catch (error) {
        statusMsg.className = "status-msg success";
        statusMsg.textContent = "✅ Добавлено на страницу админа! (Телеграм провис без VPN).";
    } finally {
        ['duration', 'comment', 'customUsername'].forEach(id => localStorage.removeItem(`zavod_form_backup_${id}`));
        document.getElementById('orderForm').reset();
        if (document.getElementById('file-name-preview')) document.getElementById('file-name-preview').textContent = '';
        initCalendar();
        submitBtn.disabled = false;
    }
}

// --- СКАЧИВАНИЕ ГЛОБАЛЬНЫХ ДАННЫХ ИЗ ОБЛАКА ---
async function loadGlobalSchedule() {
    try {
        const response = await fetch(`${SCHEDULE_DB_URL}/latest`, { headers: { 'X-Master-Key': MASTER_KEY } });
        if (response.ok) {
            const data = await response.json();
            globalTasks = data.record.tasks || [];
            // Самые свежие заявки ставим наверх
            globalTasks.sort((a, b) => b.timestamp - a.timestamp);
        }
    } catch (e) {
        globalTasks = [];
    }
}

async function saveGlobalSchedule() {
    try {
        await fetch(SCHEDULE_DB_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
            body: JSON.stringify({ tasks: globalTasks })
        });
    } catch (e) {
        console.error("Критический сбой сохранения базы", e);
    }
}

// --- ВЫВОД ВСЕХ ЗАЯВОК СПЛОШНЫМ СПИСКОМ БЕЗ ФИЛЬТРОВ ---
function renderAllTasksPlain() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    container.innerHTML = '';

    if (globalTasks.length === 0) {
        container.innerHTML = '<p class="no-tasks">Список заявок пока пуст</p>';
        return;
    }

    globalTasks.forEach(task => {
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
