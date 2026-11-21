// Smart Campus demo application. Front-end only; do not use for real authentication or emergency dispatch.
const STORE = {users:"sc_users",session:"sc_session",locations:"sc_locations",announcements:"sc_announcements",feedback:"sc_feedback"};
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const read = (key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)) ?? fallback}catch{return fallback}};
const write = (key,value)=>localStorage.setItem(key,JSON.stringify(value));
let locations = read(STORE.locations, DEFAULT_LOCATIONS);
let announcements = read(STORE.announcements, DEFAULT_ANNOUNCEMENTS);
let session = read(STORE.session,null);
let toastTimer;
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2800)}
function showPage(name){
  if(name==="dashboard"&&!session) name="login";
  $$(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${name}`));
  $$(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.page===name));
  $("#mainNav").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
  if(name==="map") renderMap();
  if(name==="facilities") renderFacilities();
  if(name==="announcements") renderAnnouncements();
  if(name==="dashboard") renderDashboard();
  if(name==="feedback"&&session) $("#feedbackName").value=session.name;
}
function updateHeader(){
  const area=$("#topActions");
  if(session){area.innerHTML=`<button class="btn btn-ghost" data-page="dashboard">Dashboard</button><button class="btn btn-primary" data-action="logout">Log out</button>`}
  else area.innerHTML=`<button class="btn btn-ghost" data-action="login">Log in</button><button class="btn btn-primary" data-action="register">Get started</button>`;
}
function renderDashboard(){
  $("#welcomeTitle").textContent=`Welcome, ${session.name.split(" ")[0]}!`;
  $("#roleChip").textContent=session.role;$("#dashboardRole").textContent=session.role;
  $("#locationCount").textContent=locations.length;$("#announcementCount").textContent=announcements.length;
  $("#adminPanel").classList.toggle("hidden",session.role!=="Admin");
}
function getLocation(id){return locations.find(x=>x.id===Number(id))}
function renderMap(){
  const start=$("#routeStart"),end=$("#routeEnd");
  const opts=locations.map(l=>`<option value="${l.id}">${escapeHtml(l.name)}</option>`).join("");
  const previousStart=start.value,previousEnd=end.value;
  start.innerHTML=opts;end.innerHTML=opts;
  if(previousStart)start.value=previousStart;if(previousEnd)end.value=previousEnd;
  if(start.value===end.value&&locations.length>1)end.selectedIndex=1;
  const map=$("#campusMap");
  map.innerHTML=`<div class="map-zone zone-one"></div><div class="map-zone zone-two"></div><div class="campus-road r1"></div><div class="campus-road r2"></div><div class="campus-road r3"></div>`;
  locations.forEach(l=>{
    const b=document.createElement("button");b.className="map-location";b.style.left=l.x+"%";b.style.top=l.y+"%";b.textContent=l.name;b.title=l.description;
    b.addEventListener("click",()=>{end.value=String(l.id);toast(`${l.name} selected as destination`)});
    map.appendChild(b);
  });
  $("#popularLocations").innerHTML=locations.slice(0,5).map(l=>`<div class="directory-item"><span>${escapeHtml(l.name)}</span><button data-destination="${l.id}">Set destination</button></div>`).join("");
}
function routeDistance(a,b){const dx=(a.x-b.x)*0.8,dy=(a.y-b.y)*0.8;return Math.max(1,Math.round(Math.sqrt(dx*dx+dy*dy)*1.5))}

function showRoute() {
    const a = getLocation($("#routeStart").value);
    const b = getLocation($("#routeEnd").value);

    if (!a || !b) {
        return toast("Please select both locations.");
    }

    if (a.id === b.id) {
        return toast("Choose two different locations.");
    }

    const map = $("#campusMap");

    // Remove previous route
    const oldRoute = map.querySelector("#routeLine");
    if (oldRoute) oldRoute.remove();

    // Find selected map markers
    const markers = [...map.querySelectorAll(".map-location")];

    const start = markers.find(el =>
        el.textContent.trim() === a.name
    );

    const end = markers.find(el =>
        el.textContent.trim() === b.name
    );

    if (!start || !end) {
        return toast("Location not found on the map.");
    }

    // Calculate marker positions
    const mapRect = map.getBoundingClientRect();
    const startRect = start.getBoundingClientRect();
    const endRect = end.getBoundingClientRect();

    const x1 = startRect.left + startRect.width / 2 - mapRect.left;
    const y1 = startRect.top + startRect.height / 2 - mapRect.top;

    const x2 = endRect.left + endRect.width / 2 - mapRect.left;
    const y2 = endRect.top + endRect.height / 2 - mapRect.top;

    // Create SVG route
    const svg = document.createElementNS(
        "http://www.w3.org/2000/svg", "svg"
    );

    svg.setAttribute("id", "routeLine");
    svg.setAttribute("width", map.clientWidth);
    svg.setAttribute("height", map.clientHeight);
    svg.setAttribute(
        "viewBox",
        `0 0 ${map.clientWidth} ${map.clientHeight}`
    );
    svg.setAttribute("preserveAspectRatio", "none");

    // Draw highlighted route
    svg.innerHTML = `
        <line
            x1="${x1}" y1="${y1}"
            x2="${x2}" y2="${y2}"
            stroke="#e63946"
            stroke-width="6"
            stroke-dasharray="10 6"
            stroke-linecap="round"
        />

        <circle cx="${x1}" cy="${y1}"
            r="9" fill="#16a34a"
            stroke="white" stroke-width="3"/>

        <circle cx="${x2}" cy="${y2}"
            r="9" fill="#e63946"
            stroke="white" stroke-width="3"/>
    `;

    map.appendChild(svg);

    // Highlight selected locations
    markers.forEach(el =>
        el.classList.remove("selected")
    );

    start.classList.add("selected");
    end.classList.add("selected");

    // Calculate distance and walking time
    const distance = routeDistance(a, b);
    const minutes = Math.max(1, Math.ceil(distance / 65));

    $("#routeResult").innerHTML = `
        <b>${escapeHtml(a.name)} → ${escapeHtml(b.name)}</b>
        <p>Estimated sample distance: ${distance.toFixed(1)} m</p>
        <p>Estimated walking time: ${minutes} min</p>
        <p>🟢 Starting point | 🔴 Destination</p>
    `;
}



function renderFacilities(){
  const q=($("#facilitySearch").value||"").toLowerCase(),cat=$("#facilityCategory").value;
  const filtered=locations.filter(l=>(cat==="All"||l.category===cat)&&(l.name+" "+l.description).toLowerCase().includes(q));
  $("#facilityGrid").innerHTML=filtered.length?filtered.map(l=>`<article class="facility-card"><div class="facility-symbol">${l.icon||"⌖"}</div><span class="facility-meta">${escapeHtml(l.category.toUpperCase())}</span><h3>${escapeHtml(l.name)}</h3><p>${escapeHtml(l.description)}</p><button class="text-link" data-map-dest="${l.id}">Find on campus ↗</button></article>`).join(""):`<p class="muted">No facilities match your search.</p>`;
}
function renderAnnouncements(){
  $("#announcementList").innerHTML=announcements.map(a=>`<article class="announcement-card"><div class="date-box"><b>${escapeHtml(a.day)}</b><small>${escapeHtml(a.month)}</small></div><div><span class="announcement-type">${escapeHtml(a.type)}</span><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.body)}</p></div></article>`).join("")||`<p class="muted">No announcements yet.</p>`;
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function openModal(title,body){
  $("#modalContent").innerHTML=`<h2>${title}</h2>${body}`;$("#modal").classList.remove("hidden");
}
function closeModal(){$("#modal").classList.add("hidden")}
async function registerUser(e) {
    e.preventDefault();

    const name = $("#regName").value.trim();
    const email = $("#regEmail").value.trim().toLowerCase();
    const password = $("#regPassword").value;
    const role = $("#regRole").value;

    try {
        const response = await fetch("http://localhost:3005/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password,
                role
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return toast(data.message);
        }

        session = { name, email, role };
        write(STORE.session, session);

        updateHeader();
        toast("Account created successfully!");
        showPage("dashboard");
        e.target.reset();

    } catch (error) {
        console.error(error);
        toast("Cannot connect to server. Please try again.");
    }
}

async function loginUser(e) {
    e.preventDefault();

    const email = $("#loginEmail").value.trim().toLowerCase();
    const password = $("#loginPassword").value;

    try {
        const response = await fetch("http://localhost:3005/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return toast(data.message);
        }

        const found = data.user;

        session = {
            name: found.name,
            email: found.email,
            role: found.role
        };

        write(STORE.session, session);
        updateHeader();
        e.target.reset();
        toast("Logged in successfully.");
        showPage("dashboard");

    } catch (error) {
        console.error(error);
        toast("Cannot connect to server, please try again.");
    }
}

function logout(){session=null;localStorage.removeItem(STORE.session);updateHeader();toast("You have logged out.");showPage("home")}
function addLocationModal(){
  openModal("Add campus location",`<form id="addLocationForm" class="form-stack"><label>Location name<input name="name" required></label><label>Category<select name="category"><option>Academic</option><option>Student services</option><option>Food</option><option>Administration</option></select></label><label>Description<input name="description" required></label><button class="btn btn-primary">Save location</button></form>`);
  $("#addLocationForm").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.target);locations.push({id:Date.now(),name:f.get("name"),category:f.get("category"),description:f.get("description"),x:15+Math.random()*70,y:15+Math.random()*70,icon:"⌖"});write(STORE.locations,locations);closeModal();renderDashboard();toast("Location added.");});
}
function addAnnouncementModal(){
  openModal("Add announcement",`<form id="addAnnouncementForm" class="form-stack"><label>Title<input name="title" required></label><label>Type<select name="type"><option>Notice</option><option>Event</option><option>Update</option></select></label><label>Date (day number)<input name="day" type="number" min="1" max="31" value="1" required></label><label>Month (3 letters)<input name="month" maxlength="3" value="DEC" required></label><label>Details<textarea name="body" required></textarea></label><button class="btn btn-primary">Publish announcement</button></form>`);
  $("#addAnnouncementForm").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.target);announcements.unshift({id:Date.now(),title:f.get("title"),type:f.get("type"),day:f.get("day"),month:f.get("month").toUpperCase(),body:f.get("body")});write(STORE.announcements,announcements);closeModal();renderDashboard();toast("Announcement published.");});
}
document.addEventListener("click",e=>{
  const page=e.target.closest("[data-page]");if(page){e.preventDefault();showPage(page.dataset.page);return}
  const action=e.target.closest("[data-action]")?.dataset.action;
  if(action==="login")showPage("login");if(action==="register")showPage("register");if(action==="logout")logout();if(action==="add-location")addLocationModal();if(action==="add-announcement")addAnnouncementModal();
  const dest=e.target.closest("[data-destination]");if(dest){showPage("map");$("#routeEnd").value=dest.dataset.destination;showRoute()}
  const mapDest=e.target.closest("[data-map-dest]");if(mapDest){showPage("map");$("#routeEnd").value=mapDest.dataset.mapDest}
});
$("#loginForm").addEventListener("submit",loginUser);
$("#registerForm").addEventListener("submit",registerUser);
$("#routeButton").addEventListener("click",showRoute);
$("#facilitySearch").addEventListener("input",renderFacilities);
$("#facilityCategory").addEventListener("change",renderFacilities);
$("#homeSearch").addEventListener("submit",e=>{e.preventDefault();showPage("facilities");$("#facilitySearch").value=$("#homeSearchInput").value;renderFacilities()});
$("#feedbackForm").addEventListener("submit",e=>{
  e.preventDefault();const item={name:$("#feedbackName").value,type:$("#feedbackType").value,rating:$("#feedbackRating").value,message:$("#feedbackMessage").value,date:new Date().toISOString()};
  const all=read(STORE.feedback,[]);all.push(item);write(STORE.feedback,all);e.target.reset();if(session)$("#feedbackName").value=session.name;toast("Thank you. Your feedback has been saved in this browser.");
});
$("#mobileMenu").addEventListener("click",()=>$("#mainNav").classList.toggle("open"));
$("#modalClose").addEventListener("click",closeModal);
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
$("#year").textContent=new Date().getFullYear();
updateHeader();
if(session)showPage("dashboard");else showPage("home");
async function testBackendConnection() {
    try {
        const response = await fetch("/api/status");
        const data = await response.json();

        console.log(data.message);
    } catch (error) {
        console.error("Backend connection failed:", error);
    }
}

testBackendConnection();