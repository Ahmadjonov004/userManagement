
    /* ===========================
       Module pattern, kod tuzilishi:
       - state: users array, highlightLimit, editingId
       - storageKey: localStorage kaliti
       - init(): event listeners va dastlabki render
       - CRUD funksiyalar: addUser, updateUser, deleteUser
       - render() — cards render, total hisoblash
       - helpers: validate, save/load storage, sort, filter
       ============================ */

    (function(){
      const storageKey = 'advanced_users_v1';
      let users = []; // massiv ichida {id,name,email,age,favColor,createdAt}
      let highlightLimit = null;
      let editingId = null;

      // DOM elementlar
      const userForm = document.getElementById('userForm');
      const nameInput = document.getElementById('name');
      const emailInput = document.getElementById('email');
      const ageInput = document.getElementById('age');
      const favColorInput = document.getElementById('favColor');
      const favColorLabel = document.getElementById('favColorLabel');
      const submitBtn = document.getElementById('submitBtn');
      const cancelEditBtn = document.getElementById('cancelEditBtn');
      const clearAllBtn = document.getElementById('clearAllBtn');
      const cardsWrap = document.getElementById('cardsWrap');
      const totalCountEl = document.getElementById('totalCount');
      const shownCountEl = document.getElementById('shownCount');
      const sortSelect = document.getElementById('sortSelect');
      const searchInput = document.getElementById('searchInput');
      const ageHighlightLimitInput = document.getElementById('ageHighlightLimit');
      const applyHighlightBtn = document.getElementById('applyHighlight');
      const clearHighlightBtn = document.getElementById('clearHighlight');
      const exportBtn = document.getElementById('exportBtn');
      const importBtn = document.getElementById('importBtn');
      const importFile = document.getElementById('importFile');

      const nameError = document.getElementById('nameError');
      const emailError = document.getElementById('emailError');
      const ageError = document.getElementById('ageError');

      /* ---------- Helpers ---------- */
      function uid(){ return 'id_' + Date.now() + '_' + Math.floor(Math.random()*10000); }

      function saveToStorage(){
        localStorage.setItem(storageKey, JSON.stringify(users));
      }
      function loadFromStorage(){
        try{
          const raw = localStorage.getItem(storageKey);
          users = raw ? JSON.parse(raw) : [];
          if(!Array.isArray(users)) users = [];
        }catch(e){
          console.error('LocalStorage parse error', e);
          users = [];
        }
      }

      function validateForm({name, email, age}){
        let valid = true;
        nameError.style.display = 'none';
        emailError.style.display = 'none';
        ageError.style.display = 'none';

        if(!name || !name.trim()){
          nameError.innerText = "Ism maydoni bo'sh bo'lishi mumkin emas.";
          nameError.style.display = 'block';
          valid = false;
        }
        if(!email || !email.includes('@')){
          emailError.innerText = "Email to'g'ri emas — ichida '@' belgisi bo'lishi kerak.";
          emailError.style.display = 'block';
          valid = false;
        }
        const ageNum = Number(age);
        if(!Number.isFinite(ageNum) || ageNum <= 0){
          ageError.innerText = "Yosh musbat son bo'lishi kerak.";
          ageError.style.display = 'block';
          valid = false;
        }
        return valid;
      }

      function clearForm(){
        userForm.reset();
        favColorInput.value = '#2563eb';
        favColorLabel.value = '#2563eb';
        editingId = null;
        cancelEditBtn.style.display = 'none';
        submitBtn.innerText = "Qo'shish";
        // clear hidden editing input
        document.getElementById('editingId').value = '';
        nameError.style.display = 'none';
        emailError.style.display = 'none';
        ageError.style.display = 'none';
      }

      /* ---------- CRUD ---------- */
      function addUser(data){
        const user = {
          id: uid(),
          name: data.name.trim(),
          email: data.email.trim(),
          age: Number(data.age),
          favColor: data.favColor,
          createdAt: Date.now()
        };
        users.push(user);
        saveToStorage();
        render();
      }

      function updateUser(id, data){
        const idx = users.findIndex(u=>u.id===id);
        if(idx === -1) return false;
        users[idx] = {
          ...users[idx],
          name: data.name.trim(),
          email: data.email.trim(),
          age: Number(data.age),
          favColor: data.favColor
        };
        saveToStorage();
        render();
        return true;
      }

      function deleteUser(id){
        users = users.filter(u=>u.id !== id);
        saveToStorage();
        render();
      }

      function clearAll(){
        if(!confirm("Haqiqatan ham barcha yozuvlarni o'chirmoqchimisiz?")) return;
        users = [];
        saveToStorage();
        render();
      }

      /* ---------- Rendering ---------- */
      function render(){
        const q = searchInput.value.trim().toLowerCase();
        let filtered = users.filter(u => u.name.toLowerCase().includes(q));
        // sort
        filtered = applySort(filtered, sortSelect.value);

        // render
        if(filtered.length === 0){
          cardsWrap.innerHTML = '<div class="empty">Sizning qidiruvingizga mos foydalanuvchi topilmadi.</div>';
        }else{
          const frag = document.createDocumentFragment();
          const grid = document.createElement('div');
          grid.className = 'cards';
          filtered.forEach(user => {
            const card = createUserCard(user);
            grid.appendChild(card);
          });
          cardsWrap.innerHTML = '';
          cardsWrap.appendChild(grid);
        }

        totalCountEl.innerText = users.length;
        shownCountEl.innerText = filtered.length;
      }

      function createUserCard(user){
        const el = document.createElement('div');
        el.className = 'user-card';
        // set background gradient depending on favColor (subtle)
        el.style.background = `linear-gradient(180deg, ${hexToRgba(user.favColor,0.12)} 0%, ${hexToRgba(user.favColor,0.04)} 100%)`;
        el.style.border = `1px solid ${hexToRgba(user.favColor,0.12)}`;

        if(highlightLimit !== null && user.age > highlightLimit){
          el.classList.add('highlight');
        }

        // top meta
        const meta = document.createElement('div');
        meta.className = 'user-meta';

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.style.background = user.favColor;
        avatar.innerText = initials(user.name);

        const info = document.createElement('div');
        info.className = 'user-info';
        const title = document.createElement('h3');
        title.innerText = user.name;
        const sub = document.createElement('p');
        sub.innerText = `${user.email} • ${user.age} yosh`;
        info.appendChild(title);
        info.appendChild(sub);

        meta.appendChild(avatar);
        meta.appendChild(info);

        // actions
        const actions = document.createElement('div');
        actions.className = 'card-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn ghost small';
        editBtn.innerText = 'Tahrirlash';
        editBtn.addEventListener('click', ()=>startEdit(user.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn danger small';
        deleteBtn.innerText = 'O\'chirish';
        deleteBtn.addEventListener('click', ()=>{
          if(confirm(`${user.name} yozuvini o'chirmoqchimisiz?`)){
            deleteUser(user.id);
          }
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        // bottom footer
        const footer = document.createElement('div');
        footer.className = 'footer-stats';
        const badge = document.createElement('div');
        badge.className = 'badge';
        badge.innerText = `Qo'shilgan: ${new Date(user.createdAt).toLocaleString()}`;
        const colorLabel = document.createElement('div');
        colorLabel.className = 'small muted';
        colorLabel.innerText = user.favColor;

        footer.appendChild(badge);
        footer.appendChild(colorLabel);

        // assemble
        el.appendChild(meta);
        el.appendChild(actions);
        el.appendChild(footer);

        return el;
      }

      /* ---------- Utilities ---------- */
      function initials(name){
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if(parts.length === 0) return '?';
        if(parts.length === 1) return parts[0].slice(0,2).toUpperCase();
        return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
      }

      // convert hex to rgba string
      function hexToRgba(hex, alpha=1){
        if(!hex) return `rgba(0,0,0,${alpha})`;
        // support #RRGGBB
        const h = hex.replace('#','');
        const bigint = parseInt(h,16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r},${g},${b},${alpha})`;
      }

      function applySort(arr, mode){
        const copy = arr.slice();
        switch(mode){
          case 'name-asc':
            copy.sort((a,b)=> a.name.localeCompare(b.name));
            break;
          case 'name-desc':
            copy.sort((a,b)=> b.name.localeCompare(a.name));
            break;
          case 'age-asc':
            copy.sort((a,b)=> a.age - b.age);
            break;
          case 'age-desc':
            copy.sort((a,b)=> b.age - a.age);
            break;
          case 'created-asc':
            copy.sort((a,b)=> a.createdAt - b.createdAt);
            break;
          case 'created-desc':
          default:
            copy.sort((a,b)=> b.createdAt - a.createdAt);
            break;
        }
        return copy;
      }

      /* ---------- Edit flow ---------- */
      function startEdit(id){
        const user = users.find(u=>u.id===id);
        if(!user) return;
        editingId = id;
        document.getElementById('editingId').value = id;
        nameInput.value = user.name;
        emailInput.value = user.email;
        ageInput.value = user.age;
        favColorInput.value = user.favColor;
        favColorLabel.value = user.favColor;
        submitBtn.innerText = 'Yangilash';
        cancelEditBtn.style.display = 'inline-flex';
        // scroll to top of form on small screens
        window.scrollTo({top:0,behavior:'smooth'});
      }

      /* ---------- Events ---------- */
      userForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        const data = {
          name: nameInput.value,
          email: emailInput.value,
          age: ageInput.value,
          favColor: favColorInput.value || '#2563eb'
        };
        const valid = validateForm(data);
        if(!valid) return;

        const currentEditing = document.getElementById('editingId').value;
        if(currentEditing){
          // update
          const ok = updateUser(currentEditing, data);
          if(ok){
            clearForm();
            alert('Yozuv yangilandi.');
          }else{
            alert('Tahrirlashda xatolik yuz berdi.');
          }
        } else {
          addUser(data);
          userForm.reset();
          favColorInput.value = '#2563eb';
          favColorLabel.value = '#2563eb';
        }
      });

      cancelEditBtn.addEventListener('click', ()=>{
        clearForm();
      });

      clearAllBtn.addEventListener('click', clearAll);

      favColorInput.addEventListener('input', ()=>{
        favColorLabel.value = favColorInput.value;
      });
      favColorLabel.addEventListener('input', ()=>{
        // attempt to set color from text if valid hex
        const val = favColorLabel.value.trim();
        if(/^#([0-9A-F]{3}){1,2}$/i.test(val)){
          favColorInput.value = val;
        }
      });

      sortSelect.addEventListener('change', render);
      searchInput.addEventListener('input', render);

      applyHighlightBtn.addEventListener('click', ()=>{
        const v = Number(ageHighlightLimitInput.value);
        if(!Number.isFinite(v) || v <= 0){
          highlightLimit = null;
        } else {
          highlightLimit = v;
        }
        render();
      });

      clearHighlightBtn.addEventListener('click', ()=>{
        highlightLimit = null;
        ageHighlightLimitInput.value = '';
        render();
      });

      exportBtn.addEventListener('click', ()=>{
        const dataStr = JSON.stringify(users, null, 2);
        const blob = new Blob([dataStr], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users_export.json';
        a.click();
        URL.revokeObjectURL(url);
      });

      importBtn.addEventListener('click', ()=> importFile.click());
      importFile.addEventListener('change', handleImportFile);

      function handleImportFile(e){
        const file = e.target.files && e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(evt){
          try{
            const imported = JSON.parse(evt.target.result);
            if(!Array.isArray(imported)){
              alert('Import qilingan fayl noto‘g‘ri formatda (massiv bo‘lishi kerak).');
              return;
            }
            // Basic validation of objects
            const sanitized = imported.filter(item => item && item.name && item.email && item.age);
            // assign ids if missing
            const normalized = sanitized.map(item=>{
              return {
                id: item.id || uid(),
                name: String(item.name),
                email: String(item.email),
                age: Number(item.age),
                favColor: item.favColor || '#2563eb',
                createdAt: item.createdAt || Date.now()
              };
            });
            users = users.concat(normalized);
            saveToStorage();
            render();
            alert('Import muvaffaqiyatli yakunlandi. Eslatma: ba\'zi yozuvlar oddiy tozalangan bo‘lishi mumkin.');
          }catch(err){
            alert('Faylni o‘qishda xatolik yuz berdi: ' + err.message);
          }
        };
        reader.readAsText(file);
        // clear input value so same file can be chosen again if needed
        e.target.value = '';
      }

      /* ---------- Init ---------- */
      function init(){
        loadFromStorage();
        // bind initial favColorLabel
        favColorLabel.value = favColorInput.value;

        // keyboard shortcut: ESC to cancel edit
        window.addEventListener('keydown', (e)=>{
          if(e.key === 'Escape'){
            clearForm();
          }
        });

        // initial render
        render();
      }

      init();

      // Expose some functions to console for debugging
      window._usersApp = {
        getUsers: ()=>users,
        addUserRaw: addUser,
        updateUserRaw: updateUser,
        deleteUserRaw: deleteUser,
        clearAll,
        render
      };
    })();