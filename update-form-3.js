(() => {
  const SELECTORS = {
    form: '#wf-form-plot-updates',
    nameSelect: '#name',
    availabilitySelect: '#availability',
    priceInput: '#price',
    sharePriceInput: '#share-price',
    rentInput: '#rent',
    serviceChargeInput: '#service-charge',
    statusSelect: '#status',
    plotNumberHidden: 'input[name="plot_number"]',
    dataEmbeds: '[plot-data]'
  };

  let plotData = {};

  const init = () => {
    const form = document.querySelector(SELECTORS.form);
    const nameSelect = document.querySelector(SELECTORS.nameSelect);
    const priceInput = document.querySelector(SELECTORS.priceInput);
    const sharePriceInput = document.querySelector(SELECTORS.sharePriceInput);
    const rentInput = document.querySelector(SELECTORS.rentInput);
    const serviceChargeInput = document.querySelector(SELECTORS.serviceChargeInput);

    if (!form || !nameSelect || !priceInput) return;

    // 1. Parse data from CMS embeds
    parseCMSData();

    // 2. Populate the "Select Plot" dropdown
    populateDropdown(nameSelect);

    // Finsweet CMS Load All can append items after this script first runs.
    watchCMSData(nameSelect);

    // 3. Change price input to text to allow visual formatting (symbols/commas)
    priceInput.type = 'text';
    if (sharePriceInput) sharePriceInput.type = 'text';
    if (rentInput) rentInput.type = 'text';
    if (serviceChargeInput) serviceChargeInput.type = 'text';

    // 4. Event Listeners
    nameSelect.addEventListener('change', (e) => handlePlotSelection(e.target.value));
    
    setupCurrencyField(priceInput);
    if (sharePriceInput) setupCurrencyField(sharePriceInput);
    if (rentInput) setupCurrencyField(rentInput);
    if (serviceChargeInput) setupCurrencyField(serviceChargeInput);

    // Clean price data before submission
    form.addEventListener('submit', () => {
      const rawValue = normalizeNumber(priceInput.value);
      priceInput.value = rawValue; // Set to pure number for the POST request

      if (sharePriceInput) sharePriceInput.value = normalizeNumber(sharePriceInput.value);
      if (rentInput) rentInput.value = normalizeNumber(rentInput.value);
      if (serviceChargeInput) serviceChargeInput.value = normalizeNumber(serviceChargeInput.value);
    });
  };

  const parseCMSData = () => {
    document.querySelectorAll(SELECTORS.dataEmbeds).forEach(embed => {
      try {
        let text = embed.textContent.trim();
        
        // 1. Fix unquoted keys if they exist (e.g. name: -> "name":)
        text = text.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

        // 2. Fix unquoted availability values (e.g. "availability": Unavailable)
        text = text.replace(/"availability":\s*(?!null|true|false|"|')([A-Za-z]+)/g, '"availability": "$1"');

        // 3. Fix missing values (e.g. "price": ,)
        text = text.replace(/:\s*([,}\]])/g, ': null$1');

        // 4. Remove trailing commas before closing braces/brackets
        text = text.replace(/,\s*([}\]])/g, '$1');

        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed) ? parsed : [parsed];

        items.forEach(item => {
          if (item && item.name) {
            plotData[item.name] = item;
          }
        });
      } catch (err) {
        console.error("Error parsing plot data embed:", err);
      }
    });
  };

  const populateDropdown = (selectEl) => {
    // Clear existing options except the placeholder ("-")
    const placeholder = selectEl.querySelector('option[value=""]');
    selectEl.innerHTML = '';
    if (placeholder) selectEl.appendChild(placeholder);

    const names = Object.keys(plotData);
    names.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      selectEl.appendChild(opt);
    });
  };

  const watchCMSData = (selectEl) => {
    let refreshScheduled = false;

    const refresh = () => {
      if (refreshScheduled) return;
      refreshScheduled = true;

      requestAnimationFrame(() => {
        refreshScheduled = false;
        const selectedName = selectEl.value;
        parseCMSData();
        populateDropdown(selectEl);
        selectEl.value = selectedName;
      });
    };

    const includesCMSData = (node) => node.nodeType === Node.ELEMENT_NODE && (
      node.matches(SELECTORS.dataEmbeds) ||
      node.querySelector(SELECTORS.dataEmbeds)
    );

    new MutationObserver((mutations) => {
      if (mutations.some(mutation => Array.from(mutation.addedNodes).some(includesCMSData))) {
        refresh();
      }
    }).observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  const handlePlotSelection = (selectedName) => {
    const availabilitySelect = document.querySelector(SELECTORS.availabilitySelect);
    const priceInput = document.querySelector(SELECTORS.priceInput);
    const sharePriceInput = document.querySelector(SELECTORS.sharePriceInput);
    const rentInput = document.querySelector(SELECTORS.rentInput);
    const serviceChargeInput = document.querySelector(SELECTORS.serviceChargeInput);
    const statusSelect = document.querySelector(SELECTORS.statusSelect);
    const plotNumberHidden = document.querySelector(SELECTORS.plotNumberHidden);
    
    const data = plotData[selectedName];

    if (data) {
      if (availabilitySelect) availabilitySelect.value = data.availability || "";
      if (priceInput) priceInput.value = formatCurrency(data.price);
      if (sharePriceInput) sharePriceInput.value = formatCurrency(data["share-price"]);
      if (rentInput) rentInput.value = formatCurrency(data.rent);
      if (serviceChargeInput) serviceChargeInput.value = formatCurrency(data["service-charge"]);
      if (statusSelect) statusSelect.value = data.status || statusSelect.options[0]?.value || "";
      if (plotNumberHidden) plotNumberHidden.value = data.plot_number || "";
    } else {
      if (availabilitySelect) availabilitySelect.value = "";
      if (priceInput) priceInput.value = "";
      if (sharePriceInput) sharePriceInput.value = "";
      if (rentInput) rentInput.value = "";
      if (serviceChargeInput) serviceChargeInput.value = "";
      if (statusSelect) statusSelect.selectedIndex = 0;
      if (plotNumberHidden) plotNumberHidden.value = "";
    }
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined || val === '') return '';

    const { value, hasDecimal } = parseNumericValue(val);
    if (value === null) return '';

    return '£' + value.toLocaleString('en-GB', {
      minimumFractionDigits: hasDecimal ? 2 : 0,
      maximumFractionDigits: 2
    });
  };

  const normalizeNumber = (val) => {
    if (val === null || val === undefined || val === '') return '';

    const { value, hasDecimal } = parseNumericValue(val);
    if (value === null) return '';

    return hasDecimal ? value.toFixed(2) : String(Math.trunc(value));
  };

  const sanitizeEditableNumber = (val) => {
    if (val === null || val === undefined || val === '') return '';

    const cleaned = String(val).replace(/[^\d.]/g, '');
    if (!cleaned) return '';

    const dotIndex = cleaned.indexOf('.');
    if (dotIndex === -1) return cleaned;

    const integerPart = cleaned.slice(0, dotIndex);
    const decimalPart = cleaned.slice(dotIndex + 1).replace(/\./g, '');
    return `${integerPart}.${decimalPart}`;
  };

  const setupCurrencyField = (inputEl) => {
    if (!inputEl) return;

    // Keep raw numeric text while editing, then apply currency formatting on blur.
    inputEl.addEventListener('focus', () => {
      inputEl.value = normalizeNumber(inputEl.value);
    });

    inputEl.addEventListener('input', () => {
      inputEl.value = sanitizeEditableNumber(inputEl.value);
    });

    inputEl.addEventListener('blur', () => {
      inputEl.value = formatCurrency(inputEl.value);
    });
  };

  const parseNumericValue = (val) => {
    const cleaned = String(val)
      .trim()
      .replace(/,/g, '')
      .replace(/£/g, '')
      .replace(/[^\d.-]/g, '');

    if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
      return { value: null, hasDecimal: false };
    }

    const normalized = cleaned
      .replace(/(?!^)-/g, '')
      .replace(/\.(?=.*\.)/g, '');

    const parsed = Number(normalized);

    if (!Number.isFinite(parsed)) {
      return { value: null, hasDecimal: false };
    }

    return {
      value: parsed,
      hasDecimal: normalized.includes('.')
    };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();