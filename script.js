document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const ideaList = document.getElementById('ideaList');
    const ideaCards = document.querySelectorAll('.idea-card');
    const tabButtons = document.querySelectorAll('.tab-button');
    
    // --- SEARCH FUNCTIONALITY ---
    
    // Listen for keyboard input in the search bar
    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase().trim();
        filterIdeas(searchTerm, getActiveCategory());
    });
    
    // --- TAB FILTERING FUNCTIONALITY ---

    // Get the currently active category from the tabs
    const getActiveCategory = () => {
        const activeTab = document.querySelector('.tab-button.active');
        // If "All" is active, return null to show all categories
        return activeTab.textContent === 'All' ? null : activeTab.textContent;
    }
    
    // Add click listeners to all tab buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove 'active' class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // Add 'active' class to the clicked tab
            button.classList.add('active');
            
            // Re-run the filter based on the new active category and current search term
            const searchTerm = searchInput.value.toLowerCase().trim();
            filterIdeas(searchTerm, getActiveCategory());
        });
    });

    // --- CORE FILTERING LOGIC ---

    /**
     * Filters the idea cards based on a search term and category.
     * @param {string} searchTerm - The text to search for in the title.
     * @param {string|null} category - The category to filter by (or null for all).
     */
    const filterIdeas = (searchTerm, category) => {
        ideaCards.forEach(card => {
            const cardTitle = card.getAttribute('data-title').toLowerCase();
            const cardCategory = card.getAttribute('data-category');
            
            // Check 1: Does the title include the search term?
            const matchesSearch = cardTitle.includes(searchTerm);
            
            // Check 2: Does the card match the selected category?
            // If category is null (the "All" tab), this is always true.
            const matchesCategory = category === null || cardCategory === category;

            // If both checks pass, show the card; otherwise, hide it.
            if (matchesSearch && matchesCategory) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

});
