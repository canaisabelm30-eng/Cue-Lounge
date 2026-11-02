/*
  CUE LOUNGE BACKEND SETUP
  1. Create a project at https://supabase.com
  2. In Project Settings > API, copy the Project URL and anon/public key.
  3. Paste them below. Never use the service_role key in a browser website.
  4. Run Cue_Lounge_supabase_setup.sql in Supabase SQL Editor.
*/
const SUPABASE_URL = 'https://lzqojapvbyezzopxxlro.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9Oe8LImyKrVo5tUlv1Psnw_iEuqvfBI';
const supabaseConfigured =
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('PASTE_YOUR') &&
  SUPABASE_ANON_KEY.length > 30 &&
  !SUPABASE_ANON_KEY.includes('PASTE_YOUR');
const supabaseClient = (supabaseConfigured && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const tableNames=['Uno','Dos','Tres','Cuatro','Cinco','Seis','Siete','Ocho','Nueve','Diez','Once','Doce','Trece','Catorce','Quince','Dieciséis','Diecisiete','Dieciocho','Diecinueve','Veinte'];
const photos=[
  'images/table-01.jpg',
  'images/table-02.jpg',
  'images/table-03.jpg',
  'images/table-04.jpg',
  'images/table-05.jpg',
  'images/table-06.jpg'
];
let authMode='login',selectedTable=null,payment='GCash',userName='Guest',currentUser=null,staffLoginRequested=false,isStaff=false;

function showAuth(mode,staffMode=false){
  staffLoginRequested=staffMode;
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('auth').classList.remove('hidden');
  document.getElementById('site').classList.add('hidden');
  setAuthMode(mode);
  if(staffMode) document.getElementById('auth-sub').textContent='Staff sign-in. Use the account authorized by the Cue Lounge owner.';
  if(!supabaseClient) document.getElementById('auth-error').textContent='Database not configured yet. Add your Supabase URL and anon/public key in the JavaScript setup section.';
  window.scrollTo(0,0);
}
function backToIntro(){document.getElementById('auth').classList.add('hidden');document.getElementById('intro').classList.remove('hidden');window.scrollTo(0,0)}
function setAuthMode(mode){
  authMode=mode;
  document.getElementById('login-tab').classList.toggle('active',mode==='login');
  document.getElementById('signup-tab').classList.toggle('active',mode==='signup');
  document.getElementById('name-field').classList.toggle('hidden',mode!=='signup');
  document.getElementById('confirm-field').classList.toggle('hidden',mode!=='signup');
  document.getElementById('auth-name').required=mode==='signup';
  document.getElementById('auth-confirm').required=mode==='signup';
  document.getElementById('auth-heading').textContent=mode==='login'?'Welcome back.':'Make it official.';
  document.getElementById('auth-sub').textContent=mode==='login'?'Sign in to continue to Cue Lounge.':'Create your Cue Lounge customer account.';
  document.getElementById('auth-submit').textContent=mode==='login'?'Log in and continue ↗':'Create account ↗';
  document.getElementById('auth-error').textContent='';
  document.getElementById('auth-password').autocomplete=mode==='login'?'current-password':'new-password';
}
async function handleAuth(e){
  e.preventDefault();
  const email=document.getElementById('auth-email').value.trim();
  const pass=document.getElementById('auth-password').value;
  const error=document.getElementById('auth-error');
  const submit=document.getElementById('auth-submit');
  if(!supabaseClient){error.textContent='Database not configured. Add your Supabase URL and anon/public key first.';return}
  submit.disabled=true;submit.textContent='Please wait…';error.textContent='';
  try{
    if(authMode==='signup'){
      if(staffLoginRequested){error.textContent='Staff accounts must be created by the Cue Lounge owner.';return}
      const name=document.getElementById('auth-name').value.trim();
      const confirm=document.getElementById('auth-confirm').value;
      if(!name){error.textContent='Please enter your name.';return}
      if(pass!==confirm){error.textContent='Your passwords do not match.';return}
      const {data,error:signUpError}=await supabaseClient.auth.signUp({
        email,password:pass,options:{data:{full_name:name}}
      });
      if(signUpError) throw signUpError;
      if(data.session){
        currentUser=data.user;userName=name;enterSite();
      }else{
        error.textContent='Account created. Check your email to verify it, then log in.';
      }
    }else{
      const {data,error:loginError}=await supabaseClient.auth.signInWithPassword({email,password:pass});
      if(loginError) throw loginError;
      currentUser=data.user;
      userName=data.user.user_metadata?.full_name || email.split('@')[0] || 'Guest';
      await routeSignedInUser();
    }
  }catch(err){
    error.textContent=err.message || 'Unable to authenticate. Please check your details and try again.';
  }finally{
    submit.disabled=false;
    submit.textContent=authMode==='login'?'Log in and continue ↗':'Create account ↗';
  }
}
async function routeSignedInUser(){
  isStaff=false;
  if(!supabaseClient || !currentUser) return enterSite();
  const {data,error}=await supabaseClient.from('staff_members').select('user_id').eq('user_id',currentUser.id).maybeSingle();
  if(error) throw error;
  isStaff=!!data;
  if(staffLoginRequested && !isStaff){
    await supabaseClient.auth.signOut(); currentUser=null;
    document.getElementById('auth-error').textContent='This account is not authorized for staff access. Ask the Cue Lounge owner to add it.';
    return;
  }
  if(isStaff) enterStaffDashboard(); else enterSite();
}
function enterStaffDashboard(){
  document.getElementById('auth').classList.add('hidden');
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('site').classList.remove('hidden');
  document.getElementById('nav-staff').classList.remove('hidden');
  showPage('staff'); loadStaffReservations(); window.scrollTo(0,0);
}
function enterSite(){
  document.getElementById('auth').classList.add('hidden');
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('site').classList.remove('hidden');
  document.getElementById('nav-staff').classList.toggle('hidden',!isStaff);
  document.getElementById('customer').value=userName==='Guest'?'':userName;
  updateSummary();showPage('home');window.scrollTo(0,0);
}
async function logout(){
  if(supabaseClient) await supabaseClient.auth.signOut();
  currentUser=null;userName='Guest';
  document.getElementById('site').classList.add('hidden');isStaff=false;staffLoginRequested=false;showAuth('login');
}
function showPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav button[id^="nav-"]').forEach(b=>b.classList.toggle('active',b.id==='nav-'+page));
  window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});updateSummary();
}
function buildTables(targetId){
  const root=document.getElementById(targetId);
  tableNames.forEach((name,i)=>{
    const card=document.createElement('article');
    card.className='table-card';card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Select Table '+name);
    card.innerHTML=`<div class="table-photo" style="background-image:linear-gradient(0deg,#08130f22,#08130f00),url('${photos[i%photos.length]}')"></div><div class="table-card-body"><div class="eyebrow">Cue Lounge · ${String(i+1).padStart(2,'0')}</div><div class="name">Table ${name}</div><div class="meta"><span>Pool table</span><span>Reservation</span></div><div class="pick">Select this table ↗</div></div>`;
    const choose=()=>{
      selectedTable=i+1;
      document.querySelectorAll('.table-card').forEach(c=>c.classList.toggle('selected',c.dataset.table===String(selectedTable)));
      document.getElementById('chosen-label').textContent='TABLE '+name.toUpperCase();
      updateSummary();showPage('reservations');
    };
    card.addEventListener('click',choose);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}});
    card.dataset.table=String(i+1);root.appendChild(card);
  });
}
function choosePayment(method){payment=method;document.querySelectorAll('.payment-option').forEach(b=>b.classList.toggle('active',b.dataset.pay===method));updateSummary()}
function updateSummary(){
  const val=id=>document.getElementById(id);if(!val('sum-name'))return;
  val('sum-name').textContent=val('customer').value.trim()||'Not entered';
  val('sum-table').textContent=selectedTable?'Table '+tableNames[selectedTable-1]:'Not selected';
  val('sum-date').textContent=(val('date').value||'Not selected')+' · '+val('start').selectedOptions[0].text;
  val('sum-duration').textContent=val('duration').value+' hour(s)';
  val('sum-players').textContent=val('players').value;
  val('sum-payment').textContent=payment;
}
function toMinutes(hhmm){const [h,m]=hhmm.split(':').map(Number);return h*60+m}
async function reviewBooking(){
  const name=document.getElementById('customer').value.trim();
  const contact=document.getElementById('contact').value.trim();
  const date=document.getElementById('date').value;
  const start=document.getElementById('start').value;
  const duration=Number(document.getElementById('duration').value);
  const players=document.getElementById('players').value;
  const notes=document.getElementById('notes').value.trim();
  const status=document.getElementById('booking-status');
  if(!name||!contact||!date||!selectedTable){
    status.className='status error';status.textContent='Please enter your name, contact number, date, and select a table before submitting.';return;
  }
  if(!supabaseClient||!currentUser){
    status.className='status error';status.textContent='Please configure the database and log in before submitting a reservation.';return;
  }
  if(date<new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)){
    status.className='status error';status.textContent='Please choose today or a future date.';return;
  }
  const startMinutes=toMinutes(start),endMinutes=startMinutes+duration*60;
  if(endMinutes>24*60){status.className='status error';status.textContent='This reservation would end after midnight. Choose an earlier start time.';return}
  status.className='status';status.textContent='Checking table availability…';
  try{
    // The database function checks conflicts and inserts atomically, without exposing other customers' details.
    const {data,error:saveError}=await supabaseClient.rpc('create_reservation',{
      p_customer_name:name,p_contact_number:contact,p_reservation_date:date,
      p_start_time:start,p_duration_hours:duration,p_players:players,
      p_special_request:notes||null,p_table_number:selectedTable,p_payment_preference:payment
    });
    if(saveError) throw saveError;
    const reservationId=data;
    document.getElementById('review-copy').textContent=`Thank you, ${name}. Your request for Table ${tableNames[selectedTable-1]} on ${date} at ${document.getElementById('start').selectedOptions[0].text}, for ${duration} hour(s), ${players}, has been saved. Reference: ${reservationId}. Preferred payment: ${payment}. The venue still needs to confirm your request. No payment was collected.`;
    document.getElementById('review-modal').classList.remove('hidden');
    status.className='status';status.textContent='Reservation request saved successfully. It is pending venue confirmation.';
  }catch(err){
    status.className='status error';
    status.textContent=(err.message||'Could not save your reservation.')+' Please check your connection or database setup and try again.';
  }
}

function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
async function loadStaffReservations(){
 const box=document.getElementById('staff-reservations'),status=document.getElementById('staff-status');
 if(!isStaff||!currentUser||!supabaseClient){status.textContent='Staff access required.';return;}
 box.innerHTML='<p class="small">Loading reservations…</p>';status.textContent='';
 try{
  const {data,error}=await supabaseClient.from('reservations').select('id,customer_name,contact_number,reservation_date,start_time,duration_hours,players,special_request,table_number,payment_preference,status,created_at').order('reservation_date',{ascending:false}).order('start_time',{ascending:false});
  if(error)throw error;const rows=data||[];
  document.getElementById('staff-total').textContent=rows.length;
  document.getElementById('staff-pending').textContent=rows.filter(r=>r.status==='pending').length;
  document.getElementById('staff-confirmed').textContent=rows.filter(r=>r.status==='confirmed').length;
  if(!rows.length){box.innerHTML='<p class="small">No reservation requests yet.</p>';return;}
  box.innerHTML=rows.map(r=>`<article class="staff-booking"><div class="staff-booking-head"><div><div class="eyebrow">Table ${escapeHTML(tableNames[(r.table_number||1)-1]||r.table_number)} · ${escapeHTML(r.reservation_date)}</div><h3>${escapeHTML(r.customer_name)}</h3></div><span class="staff-pill ${escapeHTML(r.status)}">${escapeHTML(r.status)}</span></div><div class="staff-booking-details"><span><b>Time</b>${escapeHTML(String(r.start_time||'').slice(0,5))} · ${escapeHTML(r.duration_hours)} hr(s)</span><span><b>Contact</b>${escapeHTML(r.contact_number)}</span><span><b>Players</b>${escapeHTML(r.players)}</span><span><b>Payment preference</b>${escapeHTML(r.payment_preference||'Not specified')}</span></div>${r.special_request?`<p class="small"><b>Request:</b> ${escapeHTML(r.special_request)}</p>`:''}<div class="staff-actions"><label for="status-${r.id}">Update status</label><select id="status-${r.id}" onchange="updateReservationStatus('${r.id}',this.value)"><option value="pending" ${r.status==='pending'?'selected':''}>Pending</option><option value="confirmed" ${r.status==='confirmed'?'selected':''}>Confirmed</option><option value="cancelled" ${r.status==='cancelled'?'selected':''}>Cancelled</option></select></div></article>`).join('');
 }catch(err){box.innerHTML='<p class="small">Could not load reservations.</p>';status.className='status error';status.textContent=(err.message||'Unable to load reservations.')+' Check the staff SQL setup and database permissions.';}
}
async function updateReservationStatus(id,newStatus){
 if(!isStaff||!['pending','confirmed','cancelled'].includes(newStatus))return;
 const status=document.getElementById('staff-status');status.className='status';status.textContent='Saving status…';
 try{const {error}=await supabaseClient.from('reservations').update({status:newStatus}).eq('id',id);if(error)throw error;status.textContent='Reservation status updated.';await loadStaffReservations();}
 catch(err){status.className='status error';status.textContent=(err.message||'Could not update status.')+' Check the staff SQL setup.';await loadStaffReservations();}
}

function closeReview(){document.getElementById('review-modal').classList.add('hidden')}
buildTables('home-tables');buildTables('booking-tables');buildTables('venue-tables');
const dateInput=document.getElementById('date');const now=new Date();
dateInput.min=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);dateInput.value=dateInput.min;
['customer','date','start','duration','players'].forEach(id=>document.getElementById(id).addEventListener('change',updateSummary));
document.getElementById('customer').addEventListener('input',updateSummary);
document.getElementById('review-modal').addEventListener('click',e=>{if(e.target.id==='review-modal')closeReview()});

// Restore an existing signed-in session when the page is reopened.
if(supabaseClient){
  supabaseClient.auth.getSession().then(async ({data})=>{
    if(data.session){
      currentUser=data.session.user;
      userName=currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Guest';
      await routeSignedInUser();
    }
  });
}
