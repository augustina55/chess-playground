import { supabase } from './supabase'

// ── Profiles (auth + users) ───────────────────────────────────────────────────

function profileFromDb(row) {
  if (!row) return null
  return {
    id:          row.id,
    username:    row.username,
    name:        row.name,
    role:        row.role,
    avatar:      row.avatar,
    phone:       row.phone,
    email:       row.email,
    lichessId:   row.lichess_id,
    chessComId:  row.chess_com_id,
    dob:         row.dob,
    rating:      row.rating,
    settings:    row.settings || {},
    academyId:   row.academy_id,
    level:       row.level     || null,
    batchCode:   row.batch_code || null,
  }
}

export async function loginUser(username, password) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase().trim())
    .eq('password', password)
    .maybeSingle()
  if (error || !data) return null
  return profileFromDb(data)
}

export async function getProfiles() {
  const { data } = await supabase.from('profiles').select('*').order('created_at')
  return (data || []).map(profileFromDb)
}

export async function createProfile({ username, password, name, role, avatar, phone, email, level, batchCode, academyId }) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      username:   username.trim().toLowerCase(),
      password,
      name:       name.trim(),
      role:       role || 'student',
      avatar:     avatar || name.trim()[0].toUpperCase(),
      phone:      phone      || null,
      email:      email      || null,
      level:      level      || null,
      batch_code: batchCode  || null,
      academy_id: academyId  || null,
      settings:   {},
    })
    .select()
    .single()
  if (error) throw error
  return profileFromDb(data)
}

export async function getProfilesByAcademy(academyId) {
  if (!academyId) return getProfiles()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('academy_id', academyId)
    .order('created_at')
  return (data || []).map(profileFromDb)
}

export async function deleteProfile(id) {
  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) throw error
}

export async function updateProfile(id, patch) {
  const dbPatch = {}
  if (patch.name        !== undefined) dbPatch.name         = patch.name
  if (patch.phone       !== undefined) dbPatch.phone        = patch.phone
  if (patch.email       !== undefined) dbPatch.email        = patch.email
  if (patch.avatar      !== undefined) dbPatch.avatar       = patch.avatar
  if (patch.lichessId   !== undefined) dbPatch.lichess_id   = patch.lichessId
  if (patch.chessComId  !== undefined) dbPatch.chess_com_id = patch.chessComId
  if (patch.settings    !== undefined) dbPatch.settings     = patch.settings
  if (patch.rating      !== undefined) dbPatch.rating       = patch.rating
  if (patch.dob         !== undefined) dbPatch.dob          = patch.dob
  const { data, error } = await supabase
    .from('profiles').update(dbPatch).eq('id', id).select().single()
  if (error) throw error
  return profileFromDb(data)
}

// ── Batches ───────────────────────────────────────────────────────────────────

function batchFromDb(row) {
  return {
    id:          row.id,
    name:        row.name,
    coach:       row.coach,
    coachId:     row.coach_id    || null,
    academyId:   row.academy_id  || null,
    level:       row.level,
    days:        row.days        || [],
    times:       row.times       || {},
    meetingLink: row.meeting_link,
    isActive:    row.is_active,
    students:    row.students    || [],
    createdAt:   row.created_at,
  }
}

export async function getBatches() {
  const { data } = await supabase.from('batches').select('*').order('created_at')
  return (data || []).map(batchFromDb)
}

export async function createBatch(batch) {
  const { data, error } = await supabase
    .from('batches')
    .insert({
      id:           batch.id,
      name:         batch.name,
      coach:        batch.coach        || null,
      coach_id:     batch.coachId      || null,
      academy_id:   batch.academyId    || null,
      level:        batch.level        || 'Beginner',
      days:         batch.days         || [],
      times:        batch.times        || {},
      meeting_link: batch.meetingLink  || null,
      is_active:    batch.isActive     !== false,
      students:     batch.students     || [],
    })
    .select()
    .single()
  if (error) throw error
  return batchFromDb(data)
}

export async function getBatchesByAcademy(academyId) {
  if (!academyId) return getBatches()
  const { data } = await supabase
    .from('batches')
    .select('*')
    .eq('academy_id', academyId)
    .order('created_at')
  return (data || []).map(batchFromDb)
}

export async function deleteBatch(id) {
  const { error } = await supabase.from('batches').delete().eq('id', id)
  if (error) throw error
}

// ── PGNs ──────────────────────────────────────────────────────────────────────

function pgnFromDb(row) {
  return {
    id:          row.id,
    name:        row.name,
    type:        row.type,
    content:     row.content,
    puzzleCount: row.puzzle_count,
    date:        row.date,
  }
}

export async function getPgns() {
  const { data } = await supabase.from('pgns').select('*').order('created_at')
  return (data || []).map(pgnFromDb)
}

export async function createPgn(pgn, puzzles = []) {
  const { data, error } = await supabase
    .from('pgns')
    .insert({
      id:           pgn.id,
      name:         pgn.name,
      type:         pgn.type         || 'racer',
      content:      pgn.content,
      puzzle_count: pgn.puzzleCount  || 0,
      date:         pgn.date,
    })
    .select()
    .single()
  if (error) throw error

  if (puzzles.length > 0) {
    const rows = puzzles.map(p => ({
      id:       p.id,
      pgn_id:   p.pgnId,
      fen:      p.fen,
      solution: p.solution,
      name:     p.name || null,
    }))
    const { error: pe } = await supabase.from('puzzles').insert(rows)
    if (pe) throw pe
  }

  return pgnFromDb(data)
}

export async function deletePgn(id) {
  const { error } = await supabase.from('pgns').delete().eq('id', id)
  if (error) throw error
}

// ── Puzzles ───────────────────────────────────────────────────────────────────

function puzzleFromDb(row) {
  return {
    id:       row.id,
    pgnId:    row.pgn_id,
    fen:      row.fen,
    solution: row.solution,
    name:     row.name,
  }
}

export async function getPuzzlesByPgnId(pgnId) {
  if (!pgnId) return []
  const { data } = await supabase
    .from('puzzles')
    .select('*')
    .eq('pgn_id', pgnId)
    .order('id')
  return (data || []).map(puzzleFromDb)
}

// ── Homework ──────────────────────────────────────────────────────────────────

function hwFromDb(row) {
  return {
    id:          row.id,
    title:       row.title,
    batchId:     row.batch_id,
    batchName:   row.batch_name,
    pgnId:       row.pgn_id,
    pgnName:     row.pgn_name,
    dueDate:     row.due_date,
    notes:       row.notes,
    assignedBy:  row.assigned_by,
    academyId:   row.academy_id  || null,
    createdAt:   row.created_at,
  }
}

export async function getHomework() {
  const { data } = await supabase
    .from('homework')
    .select('*')
    .order('created_at', { ascending: false })
  return (data || []).map(hwFromDb)
}

export async function createHomework(hw) {
  const { data, error } = await supabase
    .from('homework')
    .insert({
      id:          hw.id,
      title:       hw.title,
      batch_id:    hw.batchId    || null,
      batch_name:  hw.batchName  || null,
      pgn_id:      hw.pgnId      || null,
      pgn_name:    hw.pgnName    || null,
      due_date:    hw.dueDate    || null,
      notes:       hw.notes      || null,
      assigned_by: hw.assignedBy || null,
      academy_id:  hw.academyId  || null,
    })
    .select()
    .single()
  if (error) throw error
  return hwFromDb(data)
}

export async function deleteHomework(id) {
  const { error } = await supabase.from('homework').delete().eq('id', id)
  if (error) throw error
}

export async function getHomeworkForBatch(batchCode) {
  if (!batchCode) return []
  const { data } = await supabase
    .from('homework')
    .select('*')
    .eq('batch_id', batchCode)
    .order('created_at', { ascending: false })
  return (data || []).map(hwFromDb)
}

export async function getHomeworkByAcademy(academyId) {
  if (!academyId) return getHomework()
  const { data } = await supabase
    .from('homework')
    .select('*')
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false })
  return (data || []).map(hwFromDb)
}

// ── Homework progress (per student, per puzzle) ───────────────────────────────

function hwProgressFromDb(row) {
  return {
    id:          row.id,
    homeworkId:  row.homework_id,
    studentId:   row.student_id,
    puzzleId:    row.puzzle_id,
    solved:      row.solved,
    wrongCount:  row.wrong_count || 0,
    timeSeconds: row.time_seconds,
    updatedAt:   row.updated_at,
  }
}

export async function getHomeworkProgress(homeworkId, studentId) {
  const { data, error } = await supabase
    .from('homework_progress')
    .select('*')
    .eq('homework_id', homeworkId)
    .eq('student_id', studentId)
  if (error) {
    console.error('[homework_progress] load failed:', error.message, { homeworkId, studentId })
    return []
  }
  return (data || []).map(hwProgressFromDb)
}

// Fetch full progress detail for a student (all HW, with timestamps + time_seconds)
export async function getFullHomeworkProgressForStudent(studentId) {
  const { data, error } = await supabase
    .from('homework_progress')
    .select('homework_id, puzzle_id, solved, time_seconds, updated_at')
    .eq('student_id', studentId)
  if (error) {
    console.error('[homework_progress] full load failed:', error.message, { studentId })
    return []
  }
  return data || []
}

// Fetch all progress rows for a student across multiple homework IDs (one query)
export async function getAllHomeworkProgressForStudent(studentId, homeworkIds) {
  if (!homeworkIds || homeworkIds.length === 0) return []
  const { data, error } = await supabase
    .from('homework_progress')
    .select('homework_id, puzzle_id, solved')
    .eq('student_id', studentId)
    .in('homework_id', homeworkIds)
  if (error) {
    console.error('[homework_progress] bulk load failed:', error.message, { studentId })
    return []
  }
  return data || []
}

export async function saveHomeworkPuzzleResult(homeworkId, studentId, puzzleId, { solved, wrongCount, timeSeconds }) {
  const { error } = await supabase
    .from('homework_progress')
    .upsert({
      homework_id:  homeworkId,
      student_id:   studentId,
      puzzle_id:    puzzleId,
      solved:       solved ?? true,
      wrong_count:  wrongCount || 0,
      time_seconds: timeSeconds || null,
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'homework_id,student_id,puzzle_id' })
  if (error) {
    console.error('[homework_progress] save failed:', error.message, { homeworkId, studentId, puzzleId })
    throw error
  }
}

// ── Race scores ───────────────────────────────────────────────────────────────

function scoreFromDb(row) {
  return {
    id:          row.id,
    userId:      row.user_id,
    name:        row.user_name,
    score:       row.score,
    wrongCount:  row.wrong_count,
    timeSeconds: row.time_seconds,
    time:        row.time_fmt,
    createdAt:   row.created_at,
  }
}

export async function getRaceLeaderboard(limit = 10) {
  const { data } = await supabase
    .from('race_scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit)
  return (data || []).map(scoreFromDb)
}

export async function getRaceScoresByUser(userId, limit = 20) {
  const { data } = await supabase
    .from('race_scores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data || []).map(scoreFromDb)
}

export async function saveRaceScore({ userId, userName, score, wrongCount, timeSeconds, timeFmt }) {
  const { data, error } = await supabase
    .from('race_scores')
    .insert({
      user_id:      userId       || null,
      user_name:    userName,
      score,
      wrong_count:  wrongCount   || 0,
      time_seconds: timeSeconds,
      time_fmt:     timeFmt,
    })
    .select()
    .single()
  if (error) throw error
  return scoreFromDb(data)
}

// ── Coaches ───────────────────────────────────────────────────────────────────

function coachFromDb(row) {
  return {
    id:     row.id,
    name:   row.name,
    avatar: row.avatar,
    rating: row.rating,
    levels: row.levels || [],
    dob:    row.dob,
    phone:  row.phone,
    email:  row.email,
  }
}

export async function getCoaches() {
  const { data } = await supabase.from('coaches').select('*').order('created_at')
  return (data || []).map(coachFromDb)
}

export async function createCoach(coach) {
  const { data, error } = await supabase
    .from('coaches')
    .insert({
      name:   coach.name,
      avatar: coach.avatar || coach.name[0].toUpperCase(),
      rating: coach.rating ? parseInt(coach.rating) : null,
      levels: coach.levels || [],
      dob:    coach.dob    || null,
      phone:  coach.phone  || null,
      email:  coach.email  || null,
    })
    .select()
    .single()
  if (error) throw error
  return coachFromDb(data)
}

export async function deleteCoach(id) {
  const { error } = await supabase.from('coaches').delete().eq('id', id)
  if (error) throw error
}

// ── Academies ─────────────────────────────────────────────────────────────────

function academyFromDb(row) {
  return {
    id:           row.id,
    name:         row.name,
    phone:        row.phone,
    location:     row.location,
    mainCoach:    row.main_coach,
    mainCoachId:  row.main_coach_id,
    logo:         row.logo || null,
  }
}

export async function getAcademies() {
  const { data } = await supabase.from('academies').select('*').order('created_at')
  return (data || []).map(academyFromDb)
}

export async function createAcademy(ac) {
  const { data, error } = await supabase
    .from('academies')
    .insert({
      name:          ac.name,
      phone:         ac.phone         || null,
      location:      ac.location      || null,
      main_coach:    ac.mainCoach     || null,
      main_coach_id: ac.mainCoachId   || null,
    })
    .select()
    .single()
  if (error) throw error
  return academyFromDb(data)
}

export async function updateAcademy(id, patch) {
  const { data, error } = await supabase
    .from('academies')
    .update({
      ...(patch.name      !== undefined && { name: patch.name }),
      ...(patch.logo      !== undefined && { logo: patch.logo }),
      ...(patch.phone     !== undefined && { phone: patch.phone }),
      ...(patch.location  !== undefined && { location: patch.location }),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return academyFromDb(data)
}

export async function deleteAcademy(id) {
  const { error } = await supabase.from('academies').delete().eq('id', id)
  if (error) throw error
}

// ── Batch Students (junction) ─────────────────────────────────────────────────

export async function getBatchesForStudent(studentId) {
  const { data } = await supabase
    .from('batch_students')
    .select('batch_id')
    .eq('student_id', studentId)
  if (!data || data.length === 0) return []
  const ids = data.map(r => r.batch_id)
  const { data: batches } = await supabase
    .from('batches')
    .select('*')
    .in('id', ids)
    .order('name')
  return (batches || []).map(batchFromDb)
}

export async function getBatchStudents(batchId) {
  const { data } = await supabase
    .from('batch_students')
    .select('student_id')
    .eq('batch_id', batchId)
  if (!data || data.length === 0) return []
  const ids = data.map(r => r.student_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', ids)
    .order('name')
  return (profiles || []).map(profileFromDb)
}

export async function addStudentToBatch(batchId, studentId) {
  const { error } = await supabase
    .from('batch_students')
    .upsert({ batch_id: batchId, student_id: studentId })
  if (error) throw error
}

export async function removeStudentFromBatch(batchId, studentId) {
  const { error } = await supabase
    .from('batch_students')
    .delete()
    .eq('batch_id', batchId)
    .eq('student_id', studentId)
  if (error) throw error
}

export async function getBatchStudentCounts() {
  const { data } = await supabase
    .from('batch_students')
    .select('batch_id')
  const counts = {}
  for (const r of (data || [])) {
    counts[r.batch_id] = (counts[r.batch_id] || 0) + 1
  }
  return counts
}

// ── Attendance ────────────────────────────────────────────────────────────────

function attendanceFromDb(row) {
  return {
    id:        row.id,
    academyId: row.academy_id,
    batchId:   row.batch_id,
    batchCode: row.batch_code,
    coachId:   row.coach_id,
    studentId: row.student_id,
    date:      row.date,
    present:   row.present,
    createdAt: row.created_at,
  }
}

export async function getAttendanceByStudent(studentId) {
  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
  return (data || []).map(attendanceFromDb)
}

export async function getAttendanceByBatchDate(batchId, date) {
  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('batch_id', batchId)
    .eq('date', date)
  return (data || []).map(attendanceFromDb)
}

export async function getAttendanceByBatch(batchId) {
  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('batch_id', batchId)
    .order('date', { ascending: false })
  return (data || []).map(attendanceFromDb)
}

export async function upsertAttendance(records) {
  const { error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'batch_id,student_id,date' })
  if (error) throw error
}

// ── Class Sessions ────────────────────────────────────────────────────────────

function sessionFromDb(row) {
  return {
    id:        row.id,
    batchId:   row.batch_id,
    batchName: row.batch_name,
    academyId: row.academy_id,
    date:      row.date,
    title:     row.title     || '',
    notes:     row.notes     || '',
    pgnIds:    row.pgn_ids   || [],
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export async function getClassSessionsByAcademy(academyId) {
  const { data, error } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('academy_id', academyId)
    .order('date', { ascending: false })
  if (error) { console.error('[class_sessions] load failed:', error.message); return [] }
  return (data || []).map(sessionFromDb)
}

export async function getClassSessionsByBatch(batchId) {
  const { data, error } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('batch_id', batchId)
    .order('date', { ascending: false })
  if (error) { console.error('[class_sessions] batch load failed:', error.message); return [] }
  return (data || []).map(sessionFromDb)
}

export async function getClassSessionByBatchDate(batchId, date) {
  const { data, error } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('batch_id', batchId)
    .eq('date', date)
    .maybeSingle()
  if (error) { console.error('[class_sessions] date load failed:', error.message); return null }
  return data ? sessionFromDb(data) : null
}

export async function createClassSession({ batchId, batchName, academyId, date, title, notes, pgnIds, createdBy }) {
  const { data, error } = await supabase
    .from('class_sessions')
    .insert({
      batch_id:   batchId,
      batch_name: batchName,
      academy_id: academyId,
      date,
      title:      title      || null,
      notes:      notes      || null,
      pgn_ids:    pgnIds     || [],
      created_by: createdBy  || null,
    })
    .select()
    .single()
  if (error) throw error
  return sessionFromDb(data)
}

export async function updateClassSession(id, { title, notes, pgnIds, date }) {
  const patch = {}
  if (title    !== undefined) patch.title   = title
  if (notes    !== undefined) patch.notes   = notes
  if (pgnIds   !== undefined) patch.pgn_ids = pgnIds
  if (date     !== undefined) patch.date    = date
  const { data, error } = await supabase
    .from('class_sessions')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return sessionFromDb(data)
}

export async function deleteClassSession(id) {
  const { error } = await supabase.from('class_sessions').delete().eq('id', id)
  if (error) throw error
}
