# Darts Scoring Package

A complete darts scoring system extracted from the Pinnacle Darts App. Includes X01 scoring engine, tournament/league management, online play with camera support, spectator mode, and React UI components.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Scoring Engine](#scoring-engine)
- [Bot Opponent](#bot-opponent)
- [Tournament & League System](#tournament--league-system)
- [Online Play Features](#online-play-features)
- [Camera/Video Options](#cameravideo-options)
- [Spectator Mode](#spectator-mode)
- [React Components](#react-components)
- [Styling & Theme](#styling--theme)
- [Database Schema](#database-schema)

## Installation

```bash
npm install darts-scoring-package
# or
yarn add darts-scoring-package
```

## Quick Start

```typescript
import { 
  DartsScoringEngine, 
  DartsBotEngine, 
  BOT_LEVELS 
} from 'darts-scoring-package';

// Create a 501 match
const engine = new DartsScoringEngine({
  startingScore: 501,
  matchType: 'first_to',
  targetLegs: 3,
  doubleOut: true
});

// Create players
const player1 = engine.createPlayerState('Player 1', 'uuid-1');
const player2 = engine.createPlayerState('Player 2', 'uuid-2');

// Process a throw
const { player: updatedPlayer, result } = engine.applyThrow(player1, 140);

console.log(result);
// { success: true, newScore: 361, isBust: false, isLegWon: false, isMatchWon: false }
```

---

## Scoring Engine

The core `DartsScoringEngine` handles all X01 scoring logic.

### Configuration

```typescript
interface MatchConfig {
  startingScore: 501 | 301 | 170 | 121 | number;
  matchType: 'first_to' | 'best_of';
  targetLegs: number;
  targetSets?: number;
  doubleIn?: boolean;
  doubleOut?: boolean;  // Default: true
}
```

### Key Methods

| Method | Description |
|--------|-------------|
| `createPlayerState(name, id?)` | Initialize a new player |
| `processThrow(player, score)` | Validate a throw |
| `applyThrow(player, score)` | Apply throw and update state |
| `updateStats(stats, score)` | Update scoring statistics |
| `resetForNewLeg(player)` | Reset player for next leg |
| `resetForNewMatch(player)` | Full match reset |
| `getSuggestedCheckout(remaining)` | Get checkout suggestion |

### Statistics Tracked

- 65+, 90+, 100+, 140+, 170+, 180 counts
- 3-dart average
- Best leg (fewest darts)
- Highest checkout

---

## Bot Opponent

Configurable AI opponent with 6 difficulty levels.

```typescript
import { DartsBotEngine, BOT_LEVELS } from 'darts-scoring-package';

const bot = new DartsBotEngine(BOT_LEVELS[3]); // County level

// Generate a bot's score
const botScore = bot.generateScore(currentRemainingScore);
```

### Bot Levels

| Level | Name | Average | Checkout Rate |
|-------|------|---------|---------------|
| 1 | Beginner | 30 | 5% |
| 2 | Pub Player | 45 | 15% |
| 3 | Super League | 60 | 30% |
| 4 | County | 75 | 50% |
| 5 | Professional | 95 | 75% |
| 6 | Dartbot 3000 | 110 | 90% |

---

## Tournament & League System

### Tournament Formats

- **Single Elimination**: Standard knockout bracket
- **Double Elimination**: Losers bracket included
- **Round Robin**: Everyone plays everyone
- **Swiss**: Pairing by performance
- **Group Stage + Knockout**: Like World Cup format

### Creating a Tournament

```typescript
import { TournamentService } from 'darts-scoring-package';

const tournamentService = new TournamentService(supabaseClient);

// Create tournament
const tournament = await tournamentService.createTournament({
  name: 'Summer Championship',
  format: 'single_elimination',
  max_players: 32,
  min_players: 8,
  legs_per_match: 3,
  match_type: 'first_to',
  starting_score: 501,
  registration_start: '2025-01-01',
  registration_end: '2025-01-10',
  start_date: '2025-01-15',
  entry_fee: 10,
  prize_pool: 200
});

// Player registration
await tournamentService.registerPlayer(tournament.id, playerId);

// Generate bracket when ready
await tournamentService.generateBracket(tournament.id);
```

### League System

```typescript
import { LeagueService } from 'darts-scoring-package';

const leagueService = new LeagueService(supabaseClient);

// Create league
const league = await leagueService.createLeague({
  name: 'Winter League',
  type: 'seasonal',
  matches_per_week: 2,
  points_for_win: 3,
  points_for_draw: 1,
  points_for_loss: 0,
  legs_per_match: 5,
  starting_score: 501
});

// Join league
await leagueService.joinLeague(league.id, playerId);

// Generate weekly fixtures
await leagueService.generateWeeklyFixtures(league.id, 1);

// Get standings
const standings = await leagueService.getStandings(league.id);
```

---

## Online Play Features

### Room Code System

Players create/join matches using 6-character room codes (like "ABC123").

```typescript
import { OnlineMatchService } from 'darts-scoring-package';

const onlineService = new OnlineMatchService(supabaseClient);

// Host creates match
const match = await onlineService.createMatch(hostId, {
  starting_score: 501,
  legs_to_win: 3,
  spectators_allowed: true,
  host_stream_enabled: true
});

console.log(match.room_code); // "XK7P2M"

// Guest joins
const joinedMatch = await onlineService.joinMatch('XK7P2M', guestId);
```

### Real-time Sync

```typescript
// Subscribe to match updates
onlineService.subscribeToMatch(matchId, (match) => {
  // Update UI with new match state
  setHostScore(match.host_score);
  setGuestScore(match.guest_score);
});
```

---

## Camera/Video Options

### Option 1: WebRTC Peer-to-Peer (Recommended for 1v1)

**How it works**: Direct video stream between two players using WebRTC.

**Pros**:
- Low latency (direct connection)
- No server video costs
- Works well for 1v1 matches
- Similar to Dart Counter's approach

**Cons**:
- Scaling issues for many spectators
- May need TURN server for firewalls

```typescript
import { CameraStreamManager, WebRTCPeer } from 'darts-scoring-package';

// Get local camera
const camera = new CameraStreamManager();
const stream = await camera.startLocalStream(videoElement, {
  video: true,
  audio: false,
  quality: 'medium'
});

// Create peer connection
const peer = new WebRTCPeer();
peer.addLocalStream(stream);

// Handle incoming video
peer.onRemoteStream((remoteStream) => {
  remoteVideoElement.srcObject = remoteStream;
});
```

### Option 2: Media Server (For Spectators)

**Services to consider**:

| Service | Cost | Spectator Support | Latency |
|---------|------|-------------------|---------|
| **Agora.io** | Pay-per-use | Excellent | Low |
| **Twilio** | Pay-per-use | Good | Low |
| **LiveKit** | Self-host free | Excellent | Low |
| **Mux** | Pay-per-use | Excellent | Medium |
| **Daily.co** | Free tier | Good | Low |

**Recommended**: **LiveKit** (open source, self-hostable) or **Daily.co** (easy integration, free tier).

### Option 3: Dartboard Camera Integration

For electronic dartboards that support camera output:

```typescript
// Screen capture API for board displays
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: { cursor: 'always' },
  audio: false
});
```

### Implementation Approaches

#### Approach A: Camera Pointed at Board (Like Dart Counter)

Player sets up phone/webcam to show:
- Their dartboard
- Their throw area
- Score display (optional overlay)

**Setup Guide for Users**:
1. Position camera 1-2 meters from board
2. Ensure good lighting (avoid shadows)
3. Frame shows full board and throw line
4. Use phone stand or tripod

#### Approach B: Screen Sharing

For electronic boards that have displays:
- Share the board's screen/app
- Lower bandwidth than video
- Clear score visibility

#### Approach C: Hybrid

- Low-res live video of player
- Separate score data sync
- Optional board camera

---

## Spectator Mode

### Architecture Options

#### Option 1: WebRTC Broadcast (Small Scale)

```
Host → WebRTC → Guest
    ↘ WebRTC → Spectator 1
    ↘ WebRTC → Spectator 2
```

**Limit**: ~10-20 spectators per match

#### Option 2: Media Server (Large Scale)

```
Host → Media Server → CDN → Spectators (unlimited)
```

**Services**: LiveKit, Agora, Cloudflare Stream

#### Option 3: Hybrid (Recommended)

```
- Score data: Real-time DB (Supabase Realtime)
- Video: Only for host/guest via WebRTC
- Spectators: See score updates + optional delayed video via server
```

### Spectator Implementation

```typescript
// Join as spectator
const spectator = await onlineService.joinAsSpectator(
  matchId,
  'user-id',
  'SpectatorName'
);

// Subscribe to match updates
onlineService.subscribeToMatch(matchId, 
  (match) => {
    // Update scoreboard
    updateScores(match);
  },
  (spectator) => {
    // Show "X joined as spectator"
    showJoinNotification(spectator);
  }
);

// Get spectator count
const spectators = await onlineService.getSpectators(matchId);
console.log(`${spectators.length} watching`);
```

---

## React Components

### Available Components

```typescript
import {
  Button,
  ScoreDisplay,
  Keypad,
  InputDisplay,
  ThrowHistory,
  MatchStats,
  Modal,
  ScoreCardInput,
  CheckoutSuggestion
} from 'darts-scoring-package';
```

### Example: Match Scorer

```jsx
function MatchScorer() {
  const [currentInput, setCurrentInput] = useState('');
  const [player, setPlayer] = useState(engine.createPlayerState('Player 1'));

  const handleEnter = () => {
    const score = parseInt(currentInput);
    const { player: updated, result } = engine.applyThrow(player, score);
    setPlayer(updated);
    setCurrentInput('');
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <ScoreDisplay
        score={player.score}
        playerName={player.name}
        legs={player.legs}
        average={player.stats.average}
        isActive={true}
      />
      
      <InputDisplay
        value={currentInput}
        onClear={() => setCurrentInput('')}
      />
      
      <CheckoutSuggestion remaining={player.score} />
      
      <Keypad
        onNumberClick={(n) => setCurrentInput(prev => prev + n)}
        onEnter={handleEnter}
        onUndo={() => setCurrentInput(prev => prev.slice(0, -1))}
        onClear={() => setCurrentInput('')}
      />
    </div>
  );
}
```

---

## Styling & Theme

### Tailwind Configuration

```javascript
// tailwind.config.js
import { tailwindExtend } from 'darts-scoring-package';

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: tailwindExtend.theme.extend
  }
}
```

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Gold 400 | #FACC15 | Highlights, active states |
| Gold 500 | #EAB308 | Primary buttons |
| Slate 800 | #1e293b | Card backgrounds |
| Slate 900 | #0f172a | Page backgrounds |

### CSS Variables

```css
:root {
  --color-gold-500: #EAB308;
  --color-slate-900: #0f172a;
  --font-sans: 'Inter', sans-serif;
}
```

---

## Database Schema

### Required Tables

```sql
-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  rating INTEGER DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tournaments
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  format VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  max_players INTEGER,
  legs_per_match INTEGER DEFAULT 3,
  starting_score INTEGER DEFAULT 501,
  registration_start TIMESTAMP,
  registration_end TIMESTAMP,
  start_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tournament Registrations
CREATE TABLE tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id),
  player_id UUID REFERENCES players(id),
  status VARCHAR(20) DEFAULT 'pending',
  seed INTEGER,
  registered_at TIMESTAMP DEFAULT NOW()
);

-- Online Matches
CREATE TABLE online_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_id UUID REFERENCES players(id),
  guest_id UUID REFERENCES players(id),
  status VARCHAR(20) DEFAULT 'waiting',
  starting_score INTEGER DEFAULT 501,
  current_player VARCHAR(10) DEFAULT 'host',
  host_score INTEGER,
  guest_score INTEGER,
  host_legs INTEGER DEFAULT 0,
  guest_legs INTEGER DEFAULT 0,
  spectators_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spectators
CREATE TABLE spectators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES online_matches(id) ON DELETE CASCADE,
  user_id UUID,
  display_name VARCHAR(100),
  joined_at TIMESTAMP DEFAULT NOW()
);
```

---

## Recommendations for Your App

Based on your requirements, here's my recommended approach:

### For Camera/Video:

1. **Start with WebRTC P2P** for 1v1 matches - it's free and low latency
2. **Use Daily.co or LiveKit** if you need spectator video
3. **Consider screen capture** for electronic dartboards

### For Spectators:

1. **Real-time score sync** via Supabase Realtime (free tier available)
2. **Delayed video replay** rather than live video to reduce costs
3. **Chat integration** using Supabase Realtime channels

### Infrastructure:

1. **Supabase** for database + realtime + auth
2. **Vercel/Netlify** for frontend hosting
3. **TURN server** (Twilio TURN or self-hosted) for WebRTC reliability

---

## License

MIT License - see LICENSE file for details.
