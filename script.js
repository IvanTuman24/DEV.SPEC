// КОНФИГУРАЦИОННЫЕ ПАРАМЕТРЫ
const BOT_TOKEN = "7918430423:AAFPKEfOzZqmggP6nRMNZIPxG_ivXi4y41U";
const ADMIN_ID = "702501770";

// МАПА телеграм-ников заказчиков
// ЗАМКНУТЕ НИКИ В КАВЫЧКАХ
const userTelegramMap = {
    "Женя Борода": "Happiness091",
    "Влад": "free8from",
    "Ник": "fyrfyrmoscow",
    "Никита": "Shmn32",
    "Алёна Грибова": "alionagrib",
    "Нася You": "youjwllr",
    "Натали": "ntlngvtsn"
};

// СМЕНА ТЕМЫ
document.addEventListener('DOMContentLoaded', function() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleBtn.textContent = '☀️';
    } else {
        themeToggleBtn.textContent = '🌚';
    }
    
    themeToggleBtn.addEventListener('click', function() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        themeToggleBtn.textContent = isLight ? '☀️' : '🌚';
    });
});

// УПРАВЛЕНИЕ КАЛЕНДАРЕМ (ДЕФОЛТНОЕ СЕГОДНЯ ВАЛИДАЦИЯ ДНЕЙ)
document.addEventListener("DOMContentLoaded", function() {
    const dateInput = document.getElementById('date');
    const dateWarning = document.getElementById('dateWarning');
    
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
        
        // Проверка выбранной даты
        dateInput.addEventListener('change', function() {
            validateDateRestrictions(this.value, today, dateWarning);
        });
        
        validateDateRestrictions(formattedToday, today, dateWarning);
    }
});

// ФУНКЦИОНАЛ ОГРАНИЧЕНий БРОНИРОВАНия
function validateDateRestrictions(selectedDateStr, today, warningElement) {
    const selectedDate = new Date(selectedDateStr + 'T00:00:00');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const currentHour = today.getHours();
    let warning = '';
    let isWarning = false;
    
    // Проверка: на следующий день только до 16:00
    if (selectedDate.toDateString() === tomorrow.toDateString()) {
        if (currentHour >= 16) {
            warning = '⚠️ На следующий день уже нельзя задать (до 16:00)';
            isWarning = true;
        }
    } else if (selectedDate < tomorrow) {
        // Прышлые даты заблокированы
        warning = '⚠️ Невозможно выбрать прошлые даты';
        isWarning = true;
    }
    
    if (isWarning) {
        warningElement.textContent = warning;
        warningElement.style.display = 'block';
    } else {
        warningElement.style.display = 'none';
        warningElement.textContent = '';
    }
}

// ЛОГИКА ВЫБОРА ЗАКАЗЧИКА ("ИНАЧЕ")
const usernameSelect = document.getElementById('usernameSelect');
const customUsernameInput = document.getElementById('customUsername');

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

// Отображение имени прикрепленного файла
document.getElementById('fileInput').addEventListener('change', function() {
    const preview = document.getElementById('file-name-preview');
    if (this.files.length > 0) {
        preview.textContent = `📎 Выбран файл: ${this.files[0].name}`;
    } else {
        preview.textContent = '';
    }
});

// ОТПРАВКА ФОРМЫ В ТЕЛЕГРАМ (АДМИНУ + ЗАКАЗЧИКУ)
document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMessage');

    submitBtn.disabled = true;
    statusMsg.className = "status-msg";
    statusMsg.textContent = "ОБРАБОТКА";

    const tech = document.querySelector('input[name="tech"]:checked').value;
    const rawDate = document.getElementById('date').value;
    const duration = document.getElementById('duration').value;
    const comment = document.getElementById('comment').value;
    const fileInput = document.getElementById('fileInput');

    let finalUsername = usernameSelect.value;
    if (finalUsername === 'Иначе') {
        finalUsername = customUsernameInput.value.trim();
    }

    const formattedDate = rawDate.split('-').reverse().join('.');

    // ШАБЛОН ТЕКСТОВОЙ КАРтОЧКИ
    const messageText = 
` НОВАЯ ЗАЯВКА НА ТЕХНИКУ**

 **Техника:** ${tech}
 **Когда:** ${formattedDate}
 **На сколько:** ${duration}
  **Заказчик:** ${finalUsername}

  **Задача и ТЗ:**
${comment}`;

    try {
        let response;
        
        // Принудительный разрыв зависшего соединения через 15 секунд
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        if (fileInput.files.length > 0) {
            // Если отправляется файл
            const formData = new FormData();
            formData.append('chat_id', ADMIN_ID);
            formData.append('document', fileInput.files[0]);
            formData.append('caption', messageText);
            formData.append('parse_mode', 'Markdown');

            response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
        } else {
            // Если отправляется только чистый текст
            response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: ADMIN_ID,
                    text: messageText,
                    parse_mode: 'Markdown'
                }),
                signal: controller.signal
            });
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.description || 'Неизвестная ошибка Telegram API');
        }

        // ===============================================
        // ОТПРАВКА ДУБЛЯ ЗАКАЗЧИКУ В ЛИЧНЫЕ СООБЩЕНИЯ
        // ===============================================
        const userTgUsername = userTelegramMap[finalUsername];
        
        if (userTgUsername) {
            const userMessage = 
`**ВАША ЗАЯВКА ОПРИНяТА НА ВЫПОлНЕНИЕ**
━━━━━━━━━━━━━━━
 Техника: ${tech}
 Дата: ${formattedDate}
 На сколько: ${duration}

 ТЗ: ${comment}`;
            
            try {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: userTgUsername,
                        text: userMessage,
                        parse_mode: 'Markdown'
                    }),
                    signal: controller.signal
                });
            } catch (userError) {
                console.warn('Отправка заказчику не работала, но админом уведомлен', userError);
            }
        }

        // Успеховый исход
        statusMsg.className = "status-msg success";
        statusMsg.textContent = "✅ Заявка успешно доставлена постановщику задач!";
        document.getElementById('orderForm').reset();
        document.getElementById('file-name-preview').textContent = '';
        customUsernameInput.style.display = 'none';
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;

    } catch (error) {
        console.error('Ошибка при отправке в Telegram:', error);
        statusMsg.className = "status-msg error";
        
        if (error.name === 'AbortError') {
            statusMsg.textContent = "❌ Время ожидания истекло. Проверьте сеть или VPN.";
        } else {
            statusMsg.textContent = "❌ Ошибка сети. Убедитесь, что Telegram доступен на вашем устройстве.";
        }
    } finally {
        submitBtn.disabled = false;
    }
});
