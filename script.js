const currencies = [
    { code: 'RUB', name: 'Российский рубль', nominal: 1, value: 1 },
    { code: 'USD', name: 'Доллар США', nominal: 1 },
    { code: 'EUR', name: 'Евро', nominal: 1 },
    { code: 'CNY', name: 'Китайский юань', nominal: 1 },
    { code: 'JPY', name: 'Японская иена', nominal: 100 },
    { code: 'GBP', name: 'Фунт стерлингов', nominal: 1 },
    { code: 'CHF', name: 'Швейцарский франк', nominal: 1 },
    { code: 'TRY', name: 'Турецкая лира', nominal: 1 },
    { code: 'KZT', name: 'Казахстанский тенге', nominal: 100 },
    { code: 'UAH', name: 'Украинская гривна', nominal: 10 },
    { code: 'BYN', name: 'Белорусский рубль', nominal: 1 },
    { code: 'GEL', name: 'Грузинский лари', nominal: 1 },
    { code: 'AMD', name: 'Армянский драм', nominal: 100 },
    { code: 'AZN', name: 'Азербайджанский манат', nominal: 1 },
    { code: 'KRW', name: 'Южнокорейская вона', nominal: 1000 },
    { code: 'INR', name: 'Индийская рупия', nominal: 100 },
    { code: 'BRL', name: 'Бразильский реал', nominal: 1 },
    { code: 'ZAR', name: 'Южноафриканский рэнд', nominal: 10 },
    { code: 'HKD', name: 'Гонконгский доллар', nominal: 10 },
    { code: 'SGD', name: 'Сингапурский доллар', nominal: 1 }
];

let rates = {};
let lastUpdate = null;

async function fetchCBRRates() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const cbrUrl = `https://www.cbr.ru/scripts/XML_daily.asp?date_req=${day}/${month}/${year}`;

    try {
        const response = await fetch(cbrUrl);
        if (!response.ok) throw new Error('Ошибка сети');
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        const result = {};
        const valutes = xmlDoc.getElementsByTagName("Valute");
        
        for (let valute of valutes) {
            const code = valute.getElementsByTagName("CharCode")[0].textContent;
            const nominal = parseInt(valute.getElementsByTagName("Nominal")[0].textContent);
            const value = parseFloat(valute.getElementsByTagName("Value")[0].textContent.replace(',', '.'));
            
            result[code] = { nominal, value };
        }
        
        return result;
    } catch (error) {
        console.error('Ошибка при загрузке данных ЦБ:', error);
        throw error;
    }
}

async function updateRates() {
    const loader = document.querySelector('.loader');
    const updateTimeElement = document.getElementById('update-time');
    const statusElement = document.getElementById('button-status');
    
    loader.style.display = 'block';
    statusElement.textContent = 'загрузка...';
    updateTimeElement.textContent = 'Обновление...';
    
    try {
        const cbrData = await fetchCBRRates();
        
        // Обновляем курсы для всех валют
        rates = { RUB: { nominal: 1, value: 1 } };
        currencies.forEach(currency => {
            if (cbrData[currency.code]) {
                rates[currency.code] = {
                    nominal: cbrData[currency.code].nominal,
                    value: cbrData[currency.code].value
                };
            }
        });
        
        lastUpdate = new Date();
        updateTimeElement.textContent = `Обновлено: ${lastUpdate.toLocaleTimeString('ru-RU')}`;
        statusElement.textContent = '✓';
        setTimeout(() => statusElement.textContent = '', 2000);
        
        localStorage.setItem('cbrCache', JSON.stringify({ 
            data: rates, 
            time: Date.now() 
        }));
        
        convert();
    } catch (error) {
        console.error('Ошибка обновления:', error);
        updateTimeElement.textContent = 'Ошибка загрузки';
        statusElement.textContent = 'ошибка!';
        
        // Пробуем загрузить из кеша
        const cached = localStorage.getItem('cbrCache');
        if (cached) {
            try {
                const { data } = JSON.parse(cached);
                rates = data;
                convert();
            } catch (e) {
                console.error('Ошибка чтения кеша:', e);
            }
        }
    } finally {
        loader.style.display = 'none';
    }
}

function initSelects() {
    const from = document.getElementById('from-currency');
    const to = document.getElementById('to-currency');
    
    currencies.forEach(currency => {
        from.innerHTML += `<option value="${currency.code}">${currency.code} - ${currency.name}</option>`;
        to.innerHTML += `<option value="${currency.code}">${currency.code} - ${currency.name}</option>`;
    });
    
    from.value = 'USD';
    to.value = 'RUB';
}

function convert() {
    if (!rates || Object.keys(rates).length === 0) return;
    
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const from = document.getElementById('from-currency').value;
    const to = document.getElementById('to-currency').value;
    
    const fromRate = rates[from] ? (rates[from].value / rates[from].nominal) : 1;
    const toRate = rates[to] ? (rates[to].value / rates[to].nominal) : 1;
    
    document.getElementById('result').value = (amount * fromRate / toRate).toFixed(4);
}

function swapCurrencies() {
    const from = document.getElementById('from-currency');
    const to = document.getElementById('to-currency');
    [from.value, to.value] = [to.value, from.value];
    convert();
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initSelects();
    updateRates();
    document.getElementById('amount').addEventListener('input', convert);
});