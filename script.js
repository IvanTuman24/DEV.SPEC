// НАСТРОЙКИ ОБЛАЧНОЙ БАЗЫ ДАННЫХ ZAVOD
const SUPABASE_URL = "https://hbktkdkhkcelrhelnpqw.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_Jm_YEe7bOO3Q8m5nXIHbFw_fgtjlBAf";

const BOT_TOKEN = "7918430423:AAFPKEfOzZqmggP6nRMNZIPxG_ivXi4y41U";
const ADMIN_ID = "702501770";

// Инициализация подключения к базе данных Supabase
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

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
        await loadTasksFromSupabase();
        renderTasks('today');
        initFilterButtons();
    } else {
        initCalendar();
        initFormLogic();
    }
});

// --- СКАЧИВАНИЕ ДАННЫХ ИЗ ГЛОБАЛЬНОЙ БАЗЫ ---
async function loadTasksFromSupabase() {
    if (!supabase) return;
    try {
        const { data, error } = await supabase
            .from('dev table')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;
        localTasks = data || [];
    } catch (e) {
        console.error("Ошибка загрузки данных из Supabase:", e);
        localTasks = [];
    }
}

// --- ОТРИСОВКА КАРТОЧЕК В РАСПИСАНИИ ---
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

// --- ЛОГИКА РАБОТЫ С ФОРМОЙ ---
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
            statusMsg.textContent = "Внесение ТЗ в общую базу...";

            const formattedDate = rawDate.split('-').reverse().join('.');

            // 1. ОТПРАВЛЯЕМ ЗАДАЧУ В SUPABASE (в таблицу dev table)
            let supabaseSuccess = false;
            try {
                if (supabase) {
                    const { error } = await supabase
                        .from('dev table')
                        .insert([
                            { 
                                tech: tech, 
                                date: formattedDate, 
                                duration: duration, 
                                username: finalUsername, 
                                comment: comment,
                                timestamp: Date.now().toString()
                            }
                        ]);
                    if (error) throw error;
                    supabaseSuccess = true;
                }
            } catch (sbError) {
                console.error("Ошибка сохранения в базу Supabase:", sbError);
            }

            // 2. ДУБЛИРУЕМ ТЕКСТ В TELEGRAM
            const messageText = `📋 **НОВАЯ ЗАЯВКА НА ТЕХНИКУ**\n━━━━━━━━━━━━━━━\n⚙️ **Техника:** ${tech}\n📅 **Когда:** ${formattedDate}\n⏳ **На сколько:** ${duration}\n👤 **Заказчик:** ${finalUsername}\n━━━━━━━━━━━━━━━\n📝 **Задача и ТЗ:**\n${comment}`;
            
            try {
                let response;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 7000);

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
            } catch (tgError) {
                console.log("Телеграм задерживается, но в базу данные ушли.");
            }

            if (supabaseSuccess) {
                statusMsg.className = "status-msg success";
                statusMsg.textContent = "✅ Задача занесена в глобальный график расписания!";
                orderForm.reset();
                if (document.getElementById('file-name-preview')) document.getElementById('file-name-preview').textContent = '';
                customUsernameInput.style.display = 'none';
                initCalendar();
            } else {
                statusMsg.className = "status-msg error";
                statusMsg.textContent = "❌ Ошибка записи. Убедитесь, что в SQL Editor применились настройки анонимного доступа.";
            }
            submitBtn.disabled = false;
        });
    }
}
