import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const db = new Database(path.join(__dirname, 'data.sqlite'))

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT,
    jersey TEXT,
    club TEXT,
    nationality TEXT,
    age TEXT,
    height TEXT,
    weight TEXT,
    photo TEXT,
    team TEXT NOT NULL CHECK (team IN ('morocco', 'opponent')),
    is_builtin INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    opponent TEXT,
    date TEXT,
    venue TEXT,
    corners_json TEXT,
    formation TEXT,
    assignments_json TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('tagging', 'wearable')),
    date TEXT NOT NULL,
    match_id INTEGER,
    team_key TEXT,
    player_json TEXT NOT NULL,
    events_json TEXT,
    summary_json TEXT,
    session_stats_json TEXT,
    acc_history_json TEXT,
    field_positions_json TEXT,
    zone_stats_json TEXT,
    alerts_log_json TEXT,
    tag_history_json TEXT
  );

  CREATE TABLE IF NOT EXISTS expert_rules (
    id TEXT PRIMARY KEY,
    conditions_json TEXT NOT NULL,
    logic TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS ai_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model_type TEXT NOT NULL,
    model_file_json TEXT,
    output_description TEXT,
    classes_json TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
`)

// ── Lightweight migration: add matches.status if the table pre-dates it ──
const matchColumns = db.prepare("PRAGMA table_info(matches)").all().map(c => c.name)
if (!matchColumns.includes('status')) {
  db.exec("ALTER TABLE matches ADD COLUMN status TEXT NOT NULL DEFAULT 'scheduled'")
}

const BUILTIN_MOROCCO = [
  {
    name: 'Achraf Hakimi', position: 'Right Back / Wing Back', jersey: '#2', club: 'PSG',
    nationality: 'Morocco', age: '25 yrs', height: '181 cm', weight: '73 kg',
    photo: 'https://store.frmf.ma/cdn/shop/files/2_ACHRAF_HAKIMI_Away_2048x2048.webp?v=1781021899',
  },
  {
    name: 'Yassine Bounou', position: 'Goalkeeper', jersey: '#1', club: 'Al-Hilal',
    nationality: 'Morocco', age: '33 yrs', height: '192 cm', weight: '83 kg',
    photo: 'https://sponsor.frmf.ma/_next/image?url=https%3A%2F%2Fsponsor.frmf.ma%2Fapi%2Fmedia%2Ffile%2Fgoalkeeper%2520in%2520blue%2520jersey.png%3F2025-09-22T14%253A08%253A51.088Z&w=1920&q=100',
  },
  {
    name: 'Ismail Saibari', position: 'Attacking Midfielder', jersey: '#11', club: 'Galatasaray',
    nationality: 'Morocco', age: '24 yrs', height: '181 cm', weight: '76 kg',
    photo: 'https://store.frmf.ma/cdn/shop/files/11_ISMAEL_SAIBARI_8724a33b-c3b1-4dc9-ba6f-b3dba7adb274_2048x2048.webp?v=1781408332',
  },
  {
    name: 'Bilal El Khannouss', position: 'Midfielder', jersey: '#23', club: 'Leicester',
    nationality: 'Morocco', age: '20 yrs', height: '180 cm', weight: '74 kg',
    photo: 'https://store.frmf.ma/cdn/shop/files/23_BILAL_EL_KHANNOUSS_5cff16b0-a0a3-415c-a603-550fa6e0fb9e_2048x2048.webp?v=1781408332',
  },
  {
    name: 'Soufiane Rahimi', position: 'Attacker', jersey: '#9', club: 'Al-Ittihad',
    nationality: 'Morocco', age: '28 yrs', height: '183 cm', weight: '78 kg',
    photo: 'https://store.frmf.ma/cdn/shop/files/9_SOUFIANE_RAHIMI_fd4eb49b-50d1-4ce4-ba2c-f9525c6da37d_2048x2048.webp?v=1781408332',
  },
  {
    name: 'Noussair Mazraoui', position: 'Right Back', jersey: '#3', club: 'Bayern Munich',
    nationality: 'Morocco', age: '26 yrs', height: '183 cm', weight: '75 kg',
    photo: 'https://store.frmf.ma/cdn/shop/files/3_NOUSSAIR_MAZRAOUI.webp',
  },
]

const BUILTIN_OPPONENT = [
  {
    name: 'Mike Maignan', position: 'Goalkeeper', jersey: '#1', club: 'AC Milan',
    nationality: 'France', age: '30 yrs', height: '191 cm', weight: '80 kg',
    photo: 'https://fff.twic.pics/https://media.fff.fr/uploads/images/932290dc27718ee1faef74bd6a4a6573.png?twic=v1/focus=432x192/cover=380x296',
  },
  {
    name: 'Kylian Mbappe', position: 'Forward', jersey: '#10', club: 'Real Madrid',
    nationality: 'France', age: '27 yrs', height: '178 cm', weight: '73 kg',
    photo: 'https://fff.twic.pics/https://media.fff.fr/uploads/images/6603fdc34dc59cdc97f993a1260e5432.png?twic=v1/focus=377x206/cover=380x296',
  },
  {
    name: 'Ousmane Dembele', position: 'Forward', jersey: '#11', club: 'PSG',
    nationality: 'France', age: '28 yrs', height: '178 cm', weight: '67 kg',
    photo: 'https://fff.twic.pics/https://media.fff.fr/uploads/images/564683a99ff82dbb62982478c185ced9.png?twic=v1/focus=377x221/cover=380x296',
  },
]

function seedPlayers() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM players').get().n
  if (count > 0) return

  const insert = db.prepare(`
    INSERT INTO players (name, position, jersey, club, nationality, age, height, weight, photo, team, is_builtin)
    VALUES (@name, @position, @jersey, @club, @nationality, @age, @height, @weight, @photo, @team, 1)
  `)
  const insertMany = db.transaction((rows, team) => {
    for (const row of rows) insert.run({ ...row, team })
  })
  insertMany(BUILTIN_MOROCCO, 'morocco')
  insertMany(BUILTIN_OPPONENT, 'opponent')
}

seedPlayers()
