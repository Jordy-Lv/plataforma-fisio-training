import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { status, sql as rawSql, httpClient } from './helpers/auth-http.mjs';
import { sessionLogSchema } from '../lib/routines/schemas.ts';
const sql = (query) => rawSql(query).trim().split('\n')[0];
const password = 'Sesiones-prueba-1234';
const client = () => createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

test('Ejecución persistente, alertas y aislamiento por API y acciones HTTP', { timeout: 180000 }, async (t) => {
  const users = [], exerciseId = randomUUID(), replacementId = randomUUID(), routineId = randomUUID(), dayId = randomUUID(), itemId = randomUUID();
  const otherRoutineId = randomUUID(), otherDayId = randomUUID(), otherItemId = randomUUID();
  const originalSettings = sql("select jsonb_object_agg(key, value) from public.alert_settings");
  t.after(async () => {
    sql(`update public.alert_settings s set value = (j.value)::numeric from jsonb_each_text('${originalSettings}'::jsonb) j where s.key = j.key`);
    if (process.env.FISIO_KEEP_SESSION_FIXTURES === '1') {
      writeFileSync('/tmp/fisio-session-fixtures.json', JSON.stringify({ users: users.map(({ id, email, role }) => ({ id, email, role })), exerciseId, replacementId, routineId, dayId, itemId, otherRoutineId, otherDayId, otherItemId }));
      return;
    }
    sql(`delete from public.routines where id in ('${routineId}', '${otherRoutineId}'); delete from public.exercises where id in ('${exerciseId}', '${replacementId}');`);
    for (const user of users) { await user.api.auth.signOut(); sql(`delete from auth.users where id='${user.id}'`); }
  });
  async function person(role, specialty = null) {
    const api = client(), email = `sesiones-${randomUUID()}@demo.local`;
    const { data, error } = await api.auth.signUp({ email, password });
    assert.equal(error, null);
    const user = { id: data.user.id, email, role, api }; users.push(user);
    sql(`update public.profiles set role='${role}', specialty=${specialty ? `'${specialty}'` : 'null'}, full_name='Prueba de sesiones ${role}' where id='${user.id}'`);
    if (role === 'patient') sql(`insert into public.patient_details(profile_id, goal, level, environment, equipment, onboarding_step) values('${user.id}', 'performance', 'advanced', 'gym', '{none}', 3)`);
    return user;
  }
  const admin = await person('admin'), pro = await person('professional', 'training'), physio = await person('professional', 'physio'), outsider = await person('professional', 'training');
  const patient = await person('patient'), other = await person('patient');
  sql(`insert into public.care_assignments(patient_id, professional_id, kind) values ('${patient.id}','${pro.id}','training'), ('${patient.id}','${physio.id}','physio');
    insert into public.exercises(id,name,description,is_custom) values ('${exerciseId}','Sentadilla de prueba','Baja de forma controlada y consulta a tu profesional si hay dolor.',true), ('${replacementId}','Alternativa de prueba','Movimiento adaptado.',true);
    insert into public.routines(id,patient_id,kind,name) values ('${routineId}','${patient.id}','training','Sesión de prueba'), ('${otherRoutineId}','${other.id}','training','Rutina ajena');
    insert into public.routine_days(id,routine_id,day_number,title) values ('${dayId}','${routineId}',1,'Día de prueba'), ('${otherDayId}','${otherRoutineId}',1,'Día ajeno');
    insert into public.routine_items(id,routine_day_id,exercise_id,position,sets,reps,target_weight) values ('${itemId}','${dayId}','${exerciseId}',1,4,10,12), ('${otherItemId}','${otherDayId}','${exerciseId}',1,4,10,12);`);
  const base = { status: 'done', actual_sets: 3, actual_reps: 12, actual_weight: 8, pain_level: 0, perceived_effort: 6 };
  const write = (sessionId, changes = {}, actor = patient) => actor.api.from('session_logs').upsert({ session_id: sessionId, routine_item_id: itemId, patient_id: actor.id, ...base, ...changes }, { onConflict: 'session_id,routine_item_id' });
  async function start() { const result = await patient.api.rpc('start_routine_session', { target_day: dayId }); assert.equal(result.error, null); return result.data; }
  async function close(sessionId) { const result = await patient.api.from('sessions').update({ status: 'completed' }).eq('id', sessionId); assert.equal(result.error, null); }
  const alerts = async (actor = pro) => { const result = await actor.api.from('alerts').select('id,type,payload,read_at,recipient_id').eq('patient_id', patient.id).in('type', ['pain','skipped']); assert.equal(result.error,null); return result.data; };
  const formValues = { itemId, status: 'done', actualSets: '3', actualReps: '12', actualWeight: '8', perceivedEffort: '6', painLevel: '0', painLocation: '', notes: '', replacedByExerciseId: '' };
  let first;
  await t.test('Iniciar dos veces en paralelo reanuda la misma sesión', async () => {
    const ids = await Promise.all([start(), start()]); assert.equal(ids[0],ids[1]); first = ids[0];
  });
  await t.test('API rechaza día ajeno, identidad falsificada y cierre incompleto', async () => {
    assert.ok((await patient.api.rpc('start_routine_session', { target_day: otherDayId })).error);
    assert.ok((await patient.api.from('sessions').insert({ patient_id: patient.id, routine_id: otherRoutineId, routine_day_id: otherDayId })).error);
    assert.ok((await write(first, { routine_item_id: otherItemId })).error);
    assert.ok((await write(first, {}, other)).error);
    assert.ok((await patient.api.from('sessions').update({ status:'completed' }).eq('id',first)).error);
    assert.ok((await patient.api.from('sessions').update({ performed_on:'2000-01-01' }).eq('id',first)).error);
  });
  await t.test('Zod y la base rechazan dolor, zona, esfuerzo y saltado sin motivo', async () => {
    for (const changes of [{ painLevel:'11' }, { painLevel:'-1' }, { painLocation:'inventada' }, { status:'skipped' }, { perceivedEffort:'0' }])
      assert.equal(sessionLogSchema.safeParse({ ...formValues, sessionId:first, ...changes }).success, false);
    for (const changes of [{ pain_level:11 }, { pain_level:-1 }, { pain_location:'inventada' }, { status:'skipped' }, { perceived_effort:0 }, { actual_sets:-1 }]) assert.ok((await write(first, changes)).error);
  });
  await t.test('Acción HTTP guarda valores reales y una nueva visita recupera la marca', async () => {
    const web = httpClient(); await web.submit('/login', { email:patient.email, password });
    const result = await web.submit(`/routine/sessions/${first}`, { ...formValues, sessionId:first }, 'name="itemId"');
    assert.match(result.html, /Registro guardado/);
    const saved = await patient.api.from('session_logs').select('actual_sets,actual_reps,actual_weight,prescribed_sets,prescribed_reps,prescribed_weight').eq('session_id',first).single();
    assert.equal(saved.error,null); assert.deepEqual(saved.data, { actual_sets:3,actual_reps:12,actual_weight:8,prescribed_sets:4,prescribed_reps:10,prescribed_weight:12 });
    const fresh = httpClient(); await fresh.submit('/login',{ email:patient.email,password });
    const page = await fresh.request(`/routine/sessions/${first}`); assert.match(page.html,/Hecho.*guardado/);
    assert.equal(await start(),first);
  });
  await t.test('Modificar guarda sustitución y esfuerzo sin duplicar el registro', async () => {
    assert.equal((await write(first,{ status:'modified',replaced_by_exercise_id:replacementId,perceived_effort:9 })).error,null);
    const saved = await patient.api.from('session_logs').select('id,replaced_by_exercise_id,perceived_effort').eq('session_id',first);
    assert.equal(saved.data.length,1); assert.equal(saved.data[0].replaced_by_exercise_id,replacementId); assert.equal(saved.data[0].perceived_effort,9);
  });
  await t.test('Cerrar por acción HTTP permite consulta al profesional y bloquea reescrituras', async () => {
    const web = httpClient(); await web.submit('/login',{ email:patient.email,password });
    const result = await web.submit(`/routine/sessions/${first}`, { sessionId:first }, 'Terminar sesión');
    assert.match(result.html,/Sesión completada|Completada/);
    assert.ok(!result.html.includes("Terminar sesión"), "El cierre retira los controles de escritura");
    const staff = httpClient(); await staff.submit('/login',{ email:pro.email,password });
    const page = await staff.request(`/pro/sessions/${first}`); assert.match(page.html,/Alternativa de prueba/); assert.match(page.html,/Real:/);
    assert.ok((await write(first)).error);
    assert.ok((await patient.api.from('sessions').update({ status:'in_progress' }).eq('id',first)).error);
    for (const actor of [other,outsider]) {
      assert.deepEqual((await actor.api.from('sessions').select('id').eq('id',first)).data,[]);
      assert.deepEqual((await actor.api.from('session_logs').select('id').eq('session_id',first)).data,[]);
    }
    assert.equal((await alerts()).length,0);
  });
  await t.test('Tres registros del mismo día de sesión no cuentan como tres sesiones con dolor', async () => {
    const session = await start();
    for (let i=0;i<3;i++) assert.equal((await write(session,{ pain_level:8,pain_location:'knee',notes:'Dolor al bajar' })).error,null);
    await close(session); assert.equal((await alerts()).length,0);
  });
  await t.test('Tres sesiones con dolor y saltado reparten por especialidad (KAN-10 · D2)', async () => {
    for (let i=0;i<3;i++) {
      const session = await start();
      assert.equal((await write(session,{ status:'skipped',pain_level:8,pain_location:'knee',notes:`Motivo de prueba ${i+1}` })).error,null);
      await close(session);
    }
    // Este paciente lleva entrenador **y** fisioterapeuta a la vez, que es el
    // caso que el seed ya crea y el que motiva el reparto: el dolor es criterio
    // clínico y los saltados son cumplimiento. Antes las dos llegaban a los dos.
    const delEntrenador = await alerts(pro), delFisio = await alerts(physio);
    assert.ok(delEntrenador.some((a)=>a.type==='skipped'), 'El entrenador recibe los saltados');
    assert.ok(!delEntrenador.some((a)=>a.type==='pain'), 'El entrenador NO recibe el dolor');
    assert.ok(delFisio.some((a)=>a.type==='pain'), 'El fisioterapeuta recibe el dolor');
    assert.ok(!delFisio.some((a)=>a.type==='skipped'), 'El fisioterapeuta NO recibe los saltados');

    // El contenido de cada una sigue siendo el que era.
    const pain = delFisio.find((a)=>a.type==='pain'); assert.ok(new Set(pain.payload.evidence.map((e)=>e.session_id)).size>=3);
    const skipped = delEntrenador.find((a)=>a.type==='skipped'); assert.equal(skipped.payload.evidence.flat().length,3);

    // El administrador lo sigue recibiendo todo: para él no cambia nada.
    const delAdmin = await alerts(admin);
    assert.ok(delAdmin.some((a)=>a.type==='pain') && delAdmin.some((a)=>a.type==='skipped'));
    assert.ok(delAdmin.length >= delEntrenador.length + delFisio.length);

    for (const actor of [patient,other,outsider]) assert.deepEqual(await alerts(actor),[]);
  });
  await t.test('Leer una alerta no afecta a otros destinatarios ni permite alterar contenido', async () => {
    const target = (await alerts())[0];
    const web = httpClient(); await web.submit('/login',{ email:pro.email,password });
    const page = await web.request('/pro/alerts'); assert.match(page.html,/Dolor persistente/); assert.match(page.html,/Motivo de prueba/);
    const result = await web.submit('/pro/alerts', { alertId:target.id }, `value="${target.id}"`); assert.equal(result.response.status,200);
    assert.ok((await alerts()).find((a)=>a.id===target.id).read_at);
    assert.ok((await alerts(physio)).every((a)=>a.read_at===null));
    assert.ok((await pro.api.from('alerts').update({ payload:{} }).eq('id',target.id)).error);
    assert.ok((await patient.api.from('alerts').insert({ patient_id:patient.id,recipient_id:patient.id,type:'pain' })).error);
  });
  await t.test('Un ejercicio hecho interrumpe la racha de saltados', async () => {
    const before = (await alerts()).filter((a)=>a.type==='skipped').length;
    const done = await start(); assert.equal((await write(done)).error,null); await close(done);
    for(let i=0;i<2;i++) { const session=await start(); assert.equal((await write(session,{status:'skipped',pain_level:0,pain_location:'other',notes:'Sin equipo'})).error,null); await close(session); }
    assert.equal((await alerts()).filter((a)=>a.type==='skipped').length,before);
  });
  await t.test('Cambiar umbral tiene efecto y un cierre repetido no duplica alertas', async () => {
    const changed = await admin.api.from('alert_settings').update({ value:2 }).eq('key','skipped_occurrences'); assert.equal(changed.error,null);
    const session=await start(); assert.equal((await write(session,{status:'skipped',pain_level:0,pain_location:'other',notes:'Sin equipo'})).error,null); await close(session);
    const count=(await alerts()).length;
    assert.ok((await patient.api.from('sessions').update({status:'completed'}).eq('id',session)).error);
    assert.equal((await alerts()).length,count);
    assert.ok((await alerts()).some((a)=>a.type==='skipped' && a.payload.occurrences===2));
  });
  await t.test('Al terminar el vínculo desaparecen las alertas del profesional', async () => {
    sql(`update public.care_assignments set ended_at=now() where patient_id='${patient.id}' and professional_id='${pro.id}'`);
    assert.deepEqual(await alerts(pro),[]); assert.ok((await alerts(physio)).length>0);
    sql(`update public.care_assignments set ended_at=null where patient_id='${patient.id}' and professional_id='${pro.id}'`);
  });
  await t.test('Cambiar la prescripción no altera lo registrado y borrar no destruye historia', async () => {
    const changed = await pro.api.from('routine_items').update({ sets:5, exercise_id:replacementId }).eq('id',itemId);
    assert.equal(changed.error,null);
    const history = await patient.api.from('session_logs').select('exercise_id,prescribed_sets').eq('session_id',first).single();
    assert.equal(history.data.exercise_id,exerciseId); assert.equal(history.data.prescribed_sets,4);
    assert.ok((await pro.api.from('routine_items').delete().eq('id',itemId)).error);
    assert.equal((await patient.api.from('session_logs').select('id').eq('session_id',first)).data.length,1);
    assert.equal((await pro.api.from('routine_items').update({sets:4,exercise_id:exerciseId}).eq('id',itemId)).error,null);
  });
  await t.test('Camino 5 completo: tres sesiones por acciones HTTP y alerta visible para admin', async () => {
    const web=httpClient(); await web.submit('/login',{email:other.email,password});
    for(let index=0; index<3; index++) {
      const started=await web.submit('/routine',{dayId:otherDayId},`value="${otherDayId}"`);
      assert.ok(started.response.status<400);
      const session=sql(`select id from public.sessions where patient_id='${other.id}' and status='in_progress'`);
      assert.match(session,/^[a-f0-9-]{36}$/);
      const result=await web.submit(`/routine/sessions/${session}`,{...formValues, sessionId:session,itemId:otherItemId,status:'skipped',painLevel:'8',painLocation:'knee',notes:`Camino 5: sesión ${index+1}`},'name="itemId"');
      assert.match(result.html,/Registro guardado/);
      const closed=await web.submit(`/routine/sessions/${session}`,{sessionId:session},'Terminar sesión');
      assert.match(closed.html,/Completada|Sesión completada/);
    }
    const rows=await admin.api.from('alerts').select('id,type,payload').eq('patient_id',other.id).eq('recipient_id',admin.id).eq('type','pain');
    assert.equal(rows.error,null);assert.equal(rows.data.length,2);
    const staff=httpClient();await staff.submit('/login',{email:admin.email,password});
    assert.match((await staff.request('/pro/alerts')).html,/Camino 5: sesión 3/);
  });
  await t.test('La ventana excluye el día 15 y cuenta una misma zona con ejercicios diferentes', async () => {
    sql(`delete from public.sessions where patient_id='${other.id}';delete from public.alerts where patient_id='${other.id}';`);
    const dates=[14,13,0];
    async function record(offset,exercise) {
      sql(`update public.routine_items set exercise_id='${exercise}' where id='${otherItemId}'`);
      const session=randomUUID();
      sql(`insert into public.sessions(id,routine_id,routine_day_id,patient_id,performed_on) values('${session}','${otherRoutineId}','${otherDayId}','${other.id}',(now() at time zone 'America/Bogota')::date-${offset});
        insert into public.session_logs(session_id,routine_item_id,patient_id,status,pain_level,pain_location,notes) values('${session}','${otherItemId}','${other.id}','done',8,'knee','Ventana de prueba');
        update public.sessions set status='completed',completed_at=now() where id='${session}';`);
    }
    for(const [index,offset] of dates.entries()) await record(offset,index%2 ? replacementId:exerciseId);
    assert.equal((await admin.api.from('alerts').select('id').eq('patient_id',other.id).eq('recipient_id',admin.id).eq('type','pain')).data.length,0);
    await record(0,replacementId);
    const rows=await admin.api.from('alerts').select('payload').eq('patient_id',other.id).eq('recipient_id',admin.id).eq('type','pain');
    assert.equal(rows.data.length,1);assert.equal(rows.data[0].payload.dimension,'zone');
    assert.equal(new Set(rows.data[0].payload.evidence.map((e)=>e.session_id)).size,3);
  });
  await t.test('Una rutina reemplazada conserva la posibilidad de cerrar una sesión iniciada', async () => {
    const session=await start();
    assert.equal((await pro.api.from('routines').update({status:'completed'}).eq('id',routineId)).error,null);
    assert.equal((await write(session)).error,null);await close(session);
    assert.equal((await pro.api.from('routines').update({status:'active'}).eq('id',routineId)).error,null);
  });
  await t.test('Un paciente inactivo no puede iniciar ni registrar', async () => {
    const session=await start(); sql(`update public.profiles set is_active=false where id='${patient.id}'`);
    assert.ok((await patient.api.rpc('start_routine_session',{target_day:dayId})).error);
    assert.ok((await write(session)).error);
    sql(`update public.profiles set is_active=true where id='${patient.id}'`);
  });
  await t.test('KAN-10 · sin fisioterapeuta a cargo, el dolor lo recibe quien sí acompaña', async () => {
    // El reparto no puede convertirse en pérdida de señal: si nadie de la
    // especialidad que toca acompaña al paciente, la alerta va a quien sí lo
    // acompaña. Es el segundo punto del criterio del ticket, por el otro lado.
    sql(`update public.care_assignments set ended_at=now() where patient_id='${patient.id}' and professional_id='${physio.id}'`);
    try {
      const antes = (await alerts(pro)).filter((a)=>a.type==='pain').length;
      for (let i=0;i<3;i++) {
        const session = await start();
        assert.equal((await write(session,{ status:'done',pain_level:9,pain_location:'shoulder',notes:`Sin fisio ${i+1}` })).error,null);
        await close(session);
      }
      assert.ok(
        (await alerts(pro)).filter((a)=>a.type==='pain').length > antes,
        'El entrenador tiene que recibir el dolor cuando es el único que acompaña al paciente',
      );
    } finally {
      sql(`update public.care_assignments set ended_at=null where patient_id='${patient.id}' and professional_id='${physio.id}'`);
    }
  });
});
