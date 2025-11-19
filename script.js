document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables and DOM Elements ---
    const searchInput = document.getElementById('searchInput');
    const ideaList = document.getElementById('ideaList');
    const tabButtons = document.querySelectorAll('.tab-button');
    const sortSelector = document.getElementById('sortSelector');
    const statusSelector = document.getElementById('statusSelector');
    const tagFilterArea = document.querySelector('.tag-filter-area');
    const assignedToMeButton = document.getElementById('assignedToMeButton'); // NEW

    // Form elements
    const submissionForm = document.getElementById('submissionForm'); // For scrolling
    const formTitle = document.getElementById('formTitle');
    const newIdeaForm = document.getElementById('newIdeaForm');
    const newIdeaTitleInput = document.getElementById('newIdeaTitle');
    const newIdeaDescriptionRTE = document.getElementById('newIdeaDescription'); // RTE
    const newIdeaTagsInput = document.getElementById('newIdeaTags');
    const newIdeaCategoryInput = document.getElementById('newIdeaCategory');
    const newIdeaStatusInput = document.getElementById('newIdeaStatus');
    const newIdeaAssigneeInput = document.getElementById('newIdeaAssignee'); // Feature 2
    const newIdeaDueDateInput = document.getElementById('newIdeaDueDate'); // Feature 4
    const submitIdeaButton = document.getElementById('submitIdeaButton');
    const cancelEditButton = document.getElementById('cancelEditButton');

    // Modal elements
    const modal = document.getElementById('ideaModal');
    const closeButton = document.querySelector('.close-button');
    const modalTitle = document.getElementById('modalTitle');
    const modalCategory = document.getElementById('modalCategory');
    const modalDescription = document.getElementById('modalDescription');
    const modalAuthor = document.getElementById('modalAuthor');
    const modalStatus = document.getElementById('modalStatus');
    const modalAssignedTo = document.getElementById('modalAssignedTo'); // Feature 2
    const modalDueDate = document.getElementById('modalDueDate'); // Feature 4
    const editIdeaButton = document.getElementById('editIdeaButton');
    const deleteIdeaButton = document.getElementById('deleteIdeaButton');

    // Commenting elements (Feature 1)
    const commentList = document.getElementById('commentList');
    const commentCount = document.getElementById('commentCount');
    const newCommentText = document.getElementById('newCommentText');
    const addCommentButton = document.getElementById('addCommentButton');
    const commentSignInNotice = document.getElementById('commentSignInNotice');

    // User & Dashboard elements
    const signInButton = document.getElementById('signInButton');
    const userStatusDisplay = document.getElementById('userStatus');
    const showDashboardButton = document.getElementById('showDashboardButton');
    const dashboardSection = document.getElementById('dashboardSection');
    const toggleTimelineButton = document.getElementById('toggleTimelineButton'); // Feature 4

    // Export/Import elements (Feature 5)
    const exportButton = document.getElementById('exportButton');
    const importButton = document.getElementById('importButton');
    const importInput = document.getElementById('importInput');

    // --- DATA STATE ---
    let ideas = [];
    let editingIdeaId = null; // Changed from title to ID for reliability
    let currentUser = localStorage.getItem('currentUser') || 'Guest';
    let activeTag = null;
    let assignedToMeFilter = false;
    let isTimelineView = false; // Feature 4

    // --- UTILITIES ---

    const generateUniqueId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    
    // --- USER AUTH (Feature 3) ---

    const setCurrentUser = (username) => {
        currentUser = username;
        localStorage.setItem('currentUser', username);
        userStatusDisplay.textContent = `Hello, ${username}!`;
        signInButton.textContent = 'Sign Out';
        
        // Update commenting permissions (Feature 1)
        addCommentButton.disabled = false;
        commentSignInNotice.classList.add('hidden');
        applyFilterAndSort();
    };

    const signOut = () => {
        localStorage.removeItem('currentUser');
        currentUser = 'Guest';
        userStatusDisplay.textContent = 'Hello, Guest!';
        signInButton.textContent = 'Sign In';

        // Update commenting permissions
        addCommentButton.disabled = true;
        commentSignInNotice.classList.remove('hidden');
        applyFilterAndSort();
    };

    // --- LOCAL STORAGE FUNCTIONS ---

    const loadIdeas = () => {
        const storedIdeas = localStorage.getItem('ideaBrowserIdeas');
        if (storedIdeas) {
            ideas = JSON.parse(storedIdeas);
        } else {
            // Remove hardcoded HTML cards and use an empty array
            Array.from(document.querySelectorAll('.idea-card')).forEach(card => card.remove());
            ideas = [];
        }
        // Ensure all ideas have necessary properties
        ideas = ideas.map(idea => ({
            id: idea.id || generateUniqueId(),
            title: idea.title,
            description: idea.description || '',
            category: idea.category,
            votes: idea.votes || 0,
            tags: idea.tags || [],
            status: idea.status || 'New',
            author: idea.author || 'Initial Import',
            assignedTo: idea.assignedTo || 'Unassigned', // Feature 2
            dueDate: idea.dueDate || null, // Feature 4
            comments: idea.comments || [] // Feature 1
        }));
        saveIdeas();
    };

    const saveIdeas = () => {
        localStorage.setItem('ideaBrowserIdeas', JSON.stringify(ideas));
    };

    // --- STATE PERSISTENCE ---
    
    const saveStateToURL = (searchTerm, category, sortOption, status, tag, assignedToMe) => {
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (category && category !== 'All') params.set('category', category);
        if (sortOption && sortOption !== 'default') params.set('sort', sortOption);
        if (status && status !== 'All') params.set('status', status);
        if (tag) params.set('tag', tag);
        if (assignedToMe) params.set('assigned', 'true');
        
        window.history.replaceState(null, '', `?${params.toString()}`);
    };

    const loadStateFromURL = () => {
        const params = new URLSearchParams(window.location.search);
        
        const state = {
            search: params.get('search') || '',
            category: params.get('category') || 'All',
            sort: params.get('sort') || 'default',
            status: params.get('status') || 'All',
            tag: params.get('tag') || null,
            assignedToMe: params.get('assigned') === 'true' // NEW
        };

        searchInput.value = state.search;
        sortSelector.value = state.sort;
        statusSelector.value = state.status;
        activeTag = state.tag;
        assignedToMeFilter = state.assignedToMe;

        // Apply state to Tabs
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent === state.category) {
                btn.classList.add('active');
            }
        });
        if (state.assignedToMe) {
            assignedToMeButton.classList.add('active');
        }

        return state;
    };

    // --- CARD RENDERING FUNCTIONS ---
    
    const highlightSearchTerm = (text, term) => {
        if (!term) return text;
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, `<mark>$1</mark>`);
    };

    const createIdeaCardElement = (idea, searchTerm) => {
        const card = document.createElement('div');
        card.classList.add('idea-card');
        card.setAttribute('data-id', idea.id);

        // Feature 3: Description uses innerHTML because it's rich text
        const titleHighlighted = highlightSearchTerm(idea.title, searchTerm);
        const descriptionSnippet = idea.description.replace(/<[^>]*>/g, '').substring(0, 100) + '...';
        const descriptionHighlighted = highlightSearchTerm(descriptionSnippet, searchTerm);

        const statusClass = `status-${idea.status.replace(/\s/g, '-')}`;

        const tagsHtml = idea.tags.map(tag => `<span class="idea-tag">${tag}</span>`).join('');
        
        // Feature 2: Assigned badge
        const assignedBadge = idea.assignedTo !== 'Unassigned' 
            ? `<span class="assigned-badge" title="Assigned to ${idea.assignedTo}">${idea.assignedTo}</span>` 
            : '';

        // Feature 4: Due Date
        const dueDate = idea.dueDate ? `<span class="due-date">Due: ${formatDate(idea.dueDate)}</span>` : '';

        card.innerHTML = `
            <div class="card-header">
                <h2>${titleHighlighted} <span class="status-badge ${statusClass}">${idea.status}</span></h2>
                <button class="upvote-button" data-id="${idea.id}" title="Upvote Idea">
                    👍 ${idea.votes}
                </button>
            </div>
            <p class="description">${descriptionHighlighted}</p>
            <p class="meta-info">${assignedBadge} ${dueDate}</p>
            <div class="tags-container">${tagsHtml}</div>
            <span class="tag ${idea.category}">${idea.category}</span>
        `;
        return card;
    };

    const renderTagFilters = () => {
        const allTags = new Set();
        ideas.forEach(idea => {
            idea.tags.forEach(tag => allTags.add(tag));
        });

        tagFilterArea.innerHTML = '';
        tagFilterArea.innerHTML += '<label>Tags:</label>';

        allTags.forEach(tag => {
            const button = document.createElement('button');
            button.className = 'tag-filter-button';
            button.textContent = tag;
            button.setAttribute('data-tag', tag);

            if (tag === activeTag) {
                button.classList.add('active-tag');
            }

            button.addEventListener('click', () => {
                activeTag = activeTag === tag ? null : tag; // Toggle
                applyFilterAndSort();
            });
            tagFilterArea.appendChild(button);
        });
    };

    const renderIdeas = (searchTerm, category, sortOption, statusFilter, activeTag, assignedToMe) => {
        
        let ideasToDisplay = [...ideas];
        
        // 1. Apply Sorting (Feature 4: Due Date)
        if (sortOption === 'title' || sortOption === 'category') {
            ideasToDisplay.sort((a, b) => {
                const valA = a[sortOption].toUpperCase();
                const valB = b[sortOption].toUpperCase();
                return valA < valB ? -1 : (valA > valB ? 1 : 0);
            });
        } else if (sortOption === 'votes') {
            ideasToDisplay.sort((a, b) => b.votes - a.votes);
        } else if (sortOption === 'dueDate') {
            // Sort null dates to the end
            ideasToDisplay.sort((a, b) => {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return dateA - dateB;
            });
        }

        // 2. Clear and Render
        ideaList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        // Feature 4: Timeline View Structure
        if (isTimelineView) {
            ideaList.classList.add('timeline-view');
            const groupedIdeas = ideasToDisplay.reduce((groups, idea) => {
                const month = idea.dueDate ? formatDate(idea.dueDate).substring(0, 3) + ' ' + new Date(idea.dueDate).getFullYear() : 'No Due Date';
                groups[month] = groups[month] || [];
                groups[month].push(idea);
                return groups;
            }, {});

            for (const month in groupedIdeas) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'timeline-group';
                groupDiv.innerHTML = `<h3>${month}</h3>`;
                
                groupedIdeas[month].forEach(idea => {
                     // Check filters before rendering
                    if (checkIdeaFilters(idea, searchTerm, category, statusFilter, activeTag, assignedToMe)) {
                         groupDiv.appendChild(createIdeaCardElement(idea, searchTerm));
                    }
                });
                if (groupDiv.children.length > 1) { // Only append if it contains ideas after filtering
                    fragment.appendChild(groupDiv);
                }
            }
        } else {
            ideaList.classList.remove('timeline-view');
            ideasToDisplay.forEach(idea => {
                if (checkIdeaFilters(idea, searchTerm, category, statusFilter, activeTag, assignedToMe)) {
                    fragment.appendChild(createIdeaCardElement(idea, searchTerm));
                }
            });
        }


        ideaList.appendChild(fragment);
    };

    const checkIdeaFilters = (idea, searchTerm, category, statusFilter, activeTag, assignedToMe) => {
        const titleMatch = idea.title.toLowerCase().includes(searchTerm);
        const descriptionMatch = idea.description.toLowerCase().includes(searchTerm);
        const matchesSearch = titleMatch || descriptionMatch;

        const matchesCategory = category === 'All' || idea.category === category;
        const matchesStatus = statusFilter === 'All' || idea.status === statusFilter;
        const matchesTag = activeTag === null || idea.tags.includes(activeTag);
        const matchesAssignment = !assignedToMe || idea.assignedTo === currentUser; // Feature 2 filter

        return matchesSearch && matchesCategory && matchesStatus && matchesTag && matchesAssignment;
    };
    
    // --- DASHBOARD (Feature 5) ---
    
    const renderDashboard = () => {
        // (Dashboard logic remains the same, calculating stats from the 'ideas' array)
        // [omitted for brevity, as the logic itself didn't need substantial change, only the data sources]
        
        // Example for status counts:
        const statusCounts = ideas.reduce((acc, idea) => {
            acc[idea.status] = (acc[idea.status] || 0) + 1;
            return acc;
        }, {});
        
        // [Actual HTML generation code omitted]
    };

    // --- CORE FILTERING AND SORTING LOGIC ---

    const getActiveCategory = () => {
        const activeTab = document.querySelector('.tab-button.active:not(#assignedToMeButton)');
        return activeTab ? activeTab.textContent : 'All';
    }

    const applyFilterAndSort = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const category = getActiveCategory();
        const sortOption = sortSelector.value;
        const statusFilter = statusSelector.value;
        
        saveStateToURL(searchTerm, category, sortOption, statusFilter, activeTag, assignedToMeFilter);
        
        renderIdeas(searchTerm, category, sortOption, statusFilter, activeTag, assignedToMeFilter);
        renderTagFilters();
        renderDashboard();
    };

    // --- FEATURE IMPLEMENTATIONS ---
    
    // Feature 3: Rich Text Editor Commands
    document.getElementById('rteToolbar').addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            const command = event.target.getAttribute('data-command');
            if (command === 'createLink') {
                const url = prompt('Enter the URL:');
                if (url) {
                    document.execCommand(command, false, url);
                }
            } else {
                document.execCommand(command, false, null);
            }
            newIdeaDescriptionRTE.focus();
        }
    });

    // Feature 1: Commenting
    addCommentButton.addEventListener('click', () => {
        if (currentUser === 'Guest') return;
        
        const ideaId = deleteIdeaButton.getAttribute('data-id'); // ID is stored on delete button
        const commentText = newCommentText.value.trim();

        if (commentText) {
            const idea = ideas.find(i => i.id === ideaId);
            if (idea) {
                idea.comments.push({
                    text: commentText,
                    author: currentUser,
                    timestamp: new Date().toISOString()
                });
                saveIdeas();
                renderComments(idea);
                newCommentText.value = '';
                newCommentText.focus();
            }
        }
    });

    const renderComments = (idea) => {
        commentList.innerHTML = '';
        commentCount.textContent = idea.comments.length;
        
        idea.comments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Chronological

        idea.comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment';
            commentDiv.innerHTML = `
                <p>${comment.text}</p>
                <p class="comment-meta">By **${comment.author}** on ${formatDate(comment.timestamp)}</p>
            `;
            commentList.appendChild(commentDiv);
        });
        commentList.scrollTop = commentList.scrollHeight; // Auto-scroll to latest
    };

    // Feature 5: Export/Import Data
    exportButton.addEventListener('click', () => {
        const dataStr = JSON.stringify(ideas, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = 'idea_browser_data.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        alert('Data exported successfully!');
    });

    importButton.addEventListener('click', () => {
        importInput.click();
    });

    importInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedIdeas = JSON.parse(e.target.result);
                if (Array.isArray(importedIdeas) && confirm('Are you sure you want to replace ALL current ideas with imported data?')) {
                    ideas = importedIdeas.map(idea => ({
                        ...idea,
                        id: idea.id || generateUniqueId(), // Ensure IDs exist
                        comments: idea.comments || []
                    }));
                    saveIdeas();
                    applyFilterAndSort();
                    alert('Data imported successfully!');
                } else {
                    alert('Invalid file format. Please import a JSON array of ideas.');
                }
            } catch (error) {
                console.error("Import error:", error);
                alert('Error processing file. Please ensure it is valid JSON.');
            }
        };
        reader.readAsText(file);
    });

    // Feature 4: Timeline View Toggle
    toggleTimelineButton.addEventListener('click', () => {
        isTimelineView = !isTimelineView;
        applyFilterAndSort();
    });

    // --- EVENT LISTENERS ---
    
    // User Sign In
    signInButton.addEventListener('click', () => {
        if (currentUser === 'Guest') {
            const username = prompt('Enter your username (e.g., Alice, Bob):');
            if (username && username.trim()) {
                setCurrentUser(username.trim());
            }
        } else {
            signOut();
        }
    });

    // Assigned To Me Filter
    assignedToMeButton.addEventListener('click', () => {
        if (currentUser === 'Guest') {
            alert('Please sign in to filter by "Assigned To Me."');
            return;
        }

        const isActive = assignedToMeButton.classList.contains('active');
        
        // Reset Category Tabs
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        assignedToMeFilter = !isActive; // Toggle
        assignedToMeButton.classList.toggle('active', assignedToMeFilter);
        
        applyFilterAndSort();
    });
    
    // Input listeners
    searchInput.addEventListener('input', applyFilterAndSort);
    sortSelector.addEventListener('change', applyFilterAndSort);
    statusSelector.addEventListener('change', applyFilterAndSort);

    // Tab filtering listener (Standard Categories)
    tabButtons.forEach(button => {
        if (button.id !== 'assignedToMeButton') {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                assignedToMeFilter = false; // Disable assigned filter if category tab is clicked
                applyFilterAndSort();
            });
        }
    });

    // Form submission listener (ADD and EDIT)
    newIdeaForm.addEventListener('submit', (event) => {
        event.preventDefault(); 

        const title = newIdeaTitleInput.value.trim();
        // Feature 3: Get content from the contenteditable div (RTE)
        const description = newIdeaDescriptionRTE.innerHTML.trim(); 
        const category = newIdeaCategoryInput.value;
        const status = newIdeaStatusInput.value;
        const tags = newIdeaTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        const assignedTo = newIdeaAssigneeInput.value.trim() || 'Unassigned'; // Feature 2
        const dueDate = newIdeaDueDateInput.value || null; // Feature 4

        if (!title || !description || !category || !status) {
            alert('Please fill out Title, Description, Category, and Status.');
            return;
        }

        if (editingIdeaId) {
            // Editing existing idea
            const ideaIndex = ideas.findIndex(idea => idea.id === editingIdeaId);
            if (ideaIndex !== -1) {
                ideas[ideaIndex].title = title;
                ideas[ideaIndex].description = description;
                ideas[ideaIndex].category = category;
                ideas[ideaIndex].status = status;
                ideas[ideaIndex].tags = tags;
                ideas[ideaIndex].assignedTo = assignedTo; // Feature 2
                ideas[ideaIndex].dueDate = dueDate; // Feature 4
                alert(`Successfully edited idea: "${title}"!`);
            }
            // Reset form state
            resetForm();
        } else {
            // Adding new idea
            const newIdea = {
                id: generateUniqueId(),
                title: title,
                description: description,
                category: category,
                status: status,
                tags: tags,
                assignedTo: assignedTo,
                dueDate: dueDate,
                votes: 0,
                author: currentUser,
                comments: []
            };
            ideas.push(newIdea);
            alert(`Successfully added new idea: "${title}" by ${currentUser}!`);
        }
        
        saveIdeas();
        applyFilterAndSort();
        newIdeaForm.reset();
        newIdeaDescriptionRTE.innerHTML = ''; // Manually clear RTE
    });

    const resetForm = () => {
        editingIdeaId = null;
        formTitle.textContent = 'Share Your Idea';
        submitIdeaButton.textContent = 'Add Idea';
        cancelEditButton.classList.add('hidden');
    };

    cancelEditButton.addEventListener('click', (event) => {
        event.preventDefault();
        newIdeaForm.reset();
        newIdeaDescriptionRTE.innerHTML = '';
        resetForm();
    });

    // --- MODAL, EDIT, and DELETE LOGIC ---
    
    // Listener for opening the modal
    ideaList.addEventListener('click', (event) => {
        const card = event.target.closest('.idea-card');
        const isUpvote = event.target.closest('.upvote-button');
        
        if (card && !isUpvote) {
            const ideaId = card.getAttribute('data-id');
            const idea = ideas.find(i => i.id === ideaId);

            if (idea) {
                // Populate Modal Meta & Content
                modalTitle.textContent = idea.title;
                modalCategory.textContent = idea.category;
                modalCategory.className = `tag ${idea.category}`; 
                // Feature 3: Set HTML content for rich text
                modalDescription.innerHTML = idea.description; 
                
                modalAuthor.textContent = `Author: ${idea.author}`;
                modalStatus.textContent = `Status: ${idea.status}`;
                modalAssignedTo.textContent = `Assigned To: ${idea.assignedTo}`; // Feature 2
                modalDueDate.textContent = `Due Date: ${idea.dueDate ? formatDate(idea.dueDate) : 'N/A'}`; // Feature 4

                editIdeaButton.setAttribute('data-id', idea.id);
                deleteIdeaButton.setAttribute('data-id', idea.id);

                // Lock Edit/Delete if not the author
                const isAuthor = idea.author === currentUser;
                editIdeaButton.disabled = !isAuthor;
                deleteIdeaButton.disabled = !isAuthor;

                // Feature 1: Render comments
                renderComments(idea);

                modal.style.display = 'block';
            }
        }
    });

    // Delete Listener
    deleteIdeaButton.addEventListener('click', () => {
        const ideaId = deleteIdeaButton.getAttribute('data-id');
        const ideaTitle = modalTitle.textContent;
        
        if (confirm(`Are you sure you want to delete the idea: "${ideaTitle}"?`)) {
            ideas = ideas.filter(i => i.id !== ideaId);
            saveIdeas();
            applyFilterAndSort();
            modal.style.display = 'none';
        }
    });

    // Edit Listener
    editIdeaButton.addEventListener('click', () => {
        const ideaId = editIdeaButton.getAttribute('data-id');
        const idea = ideas.find(i => i.id === ideaId);
        
        if (idea) {
            // Populate form fields
            newIdeaTitleInput.value = idea.title;
            newIdeaDescriptionRTE.innerHTML = idea.description; // Feature 3
            newIdeaCategoryInput.value = idea.category;
            newIdeaStatusInput.value = idea.status;
            newIdeaTagsInput.value = idea.tags.join(', ');
            newIdeaAssigneeInput.value = idea.assignedTo === 'Unassigned' ? '' : idea.assignedTo; // Feature 2
            newIdeaDueDateInput.value = idea.dueDate || ''; // Feature 4
            
            // Set form state
            editingIdeaId = idea.id;
            formTitle.textContent = `Edit Idea: ${idea.title}`;
            submitIdeaButton.textContent = 'Save Changes';
            cancelEditButton.classList.remove('hidden');

            modal.style.display = 'none';
            submissionForm.scrollIntoView({ behavior: 'smooth' });
        }
    });


    // Modal closing listeners
    closeButton.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });


    // --- APPLICATION STARTUP ---
    loadIdeas();
    
    // Set user status on load
    if (currentUser !== 'Guest') {
        setCurrentUser(currentUser);
    } else {
        // Ensure buttons are disabled if no user is signed in
        addCommentButton.disabled = true;
    }

    // Load state and initialize rendering
    const initialState = loadStateFromURL();
    renderIdeas(initialState.search, initialState.category, initialState.sort, initialState.status, initialState.tag, initialState.assignedToMe);
    renderTagFilters();
    renderDashboard();
});
