document.addEventListener('DOMContentLoaded', (event) => {
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const searchHistory = document.getElementById('searchHistory');
    const clearButton = document.getElementById('clearButton');
    const searchModeButton = document.getElementById('searchModeButton');
    const modelSelect = document.getElementById('modelSelect');
    const fileUpload = document.getElementById('fileUpload');
    
    let isProMode = false;
    let currentFileId = null;
    
    // Load saved preferences from session storage
    const loadPreferences = () => {
        const savedModel = sessionStorage.getItem('selectedModel');
        if (savedModel) {
            modelSelect.value = savedModel;
        }
        
        const savedMode = sessionStorage.getItem('searchMode');
        if (savedMode) {
            isProMode = savedMode === 'pro';
            updateSearchModeUI();
        }
    };
    
    const toggleSearchMode = () => {
        isProMode = !isProMode;
        updateSearchModeUI();
        sessionStorage.setItem('searchMode', isProMode ? 'pro' : 'quick');
    };
    
    const updateSearchModeUI = () => {
        searchModeButton.textContent = isProMode ? 'Pro Search' : 'Quick Search';
        searchInput.placeholder = isProMode ? 'Ask detailed questions...' : 'Ask anything...';
    };
    
    const createResultCard = (query, response, sources = [], model = '') => {
        const card = document.createElement('div');
        card.className = 'bg-gray-700 rounded-lg p-6 space-y-4';
        
        const queryElement = document.createElement('div');
        queryElement.className = 'flex items-center space-x-2 text-blue-400';
        queryElement.innerHTML = `<i class="fas fa-search"></i><span>${query}</span>`;
        
        const modelElement = document.createElement('div');
        modelElement.className = 'text-sm text-purple-400';
        modelElement.textContent = `Model: ${model}`;
        
        const responseElement = document.createElement('div');
        responseElement.className = 'text-white';
        responseElement.textContent = response;
        
        card.appendChild(queryElement);
        card.appendChild(modelElement);
        card.appendChild(responseElement);
        
        if (sources.length > 0) {
            const sourcesElement = document.createElement('div');
            sourcesElement.className = 'text-sm text-gray-400 mt-4';
            sourcesElement.innerHTML = '<div class="font-bold mb-2">Sources:</div>' + 
                sources.map(source => `<div class="ml-4">• ${source}</div>`).join('');
            card.appendChild(sourcesElement);
        }
        
        return card;
    };
    
    const handleFileUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/upload_file', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.file_id) {
                currentFileId = data.file_id;
                searchInput.placeholder = `Ask questions about ${file.name}...`;
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            const errorCard = createResultCard('File Upload', 'Failed to upload file. Please try again.');
            searchHistory.insertBefore(errorCard, searchHistory.firstChild);
        }
    };
    
    const performSearch = () => {
        const searchText = searchInput.value.trim();
        if (searchText !== '') {
            const loadingCard = document.createElement('div');
            loadingCard.className = 'bg-gray-700 rounded-lg p-6 flex items-center space-x-2';
            loadingCard.innerHTML = `
                <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                <span>Searching...</span>
            `;
            searchHistory.insertBefore(loadingCard, searchHistory.firstChild);
            
            const selectedModel = modelSelect.value;
            sessionStorage.setItem('selectedModel', selectedModel);
            
            fetch('/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: searchText,
                    mode: isProMode ? 'pro' : 'quick',
                    model: selectedModel,
                    file_id: currentFileId
                }),
            })
            .then(response => response.json())
            .then(data => {
                searchHistory.removeChild(loadingCard);
                const resultCard = createResultCard(searchText, data.message, data.sources, data.model);
                searchHistory.insertBefore(resultCard, searchHistory.firstChild);
                searchInput.value = '';
            })
            .catch((error) => {
                searchHistory.removeChild(loadingCard);
                const errorCard = createResultCard(searchText, 'An error occurred while searching. Please try again.');
                searchHistory.insertBefore(errorCard, searchHistory.firstChild);
                console.error('Error:', error);
            });
        }
    };
    
    searchButton.addEventListener('click', performSearch);
    searchModeButton.addEventListener('click', toggleSearchMode);
    clearButton.addEventListener('click', () => {
        searchHistory.innerHTML = '';
        searchInput.value = '';
        currentFileId = null;
        searchInput.placeholder = 'Ask anything...';
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
            e.preventDefault();
        }
    });
    
    fileUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    // Load saved preferences when the page loads
    loadPreferences();
});