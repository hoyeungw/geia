import { CrosTab }                          from '@analys/crostab'
import { decoCrostab, decoSamples, logger } from '@spare/logger'
import { says }                             from '@spare/says'
import { nullish, valid }                   from '@typen/nullish'
import { mapper }                           from '@vect/matrix-mapper'
import { shuffle }                          from '@vect/vector-select'

export class Sight {
  static peak = 3 // 11
  static high = 2 // 10
  static low = 1 // 01
  static yard = 0 // 00
}

export class Shine {
  static ultimate = 3
  static master = 2
  static great = 1
  static none = 0
}

export class Livable { // Quietness, Fengshui, Convenience, Endurance
  static excellent = 4
  static fantastic = 3
  static great = 2
  static good = 1
}

export class price {
  static high = 1
  static low = 0
}

export class Grade {
  #v
  constructor(value) {
    this.#v = value
  }
  static build(value) { return valid(value) ? new Grade(value) : null }
  static from(object) {
    const { sight, shine, livable, price, } = object
    const value = ( sight & 0b11 ) << 6 | ( shine & 0b11 ) << 4 | ( livable & 0b11 ) << 2 | ( price & 0b11 ) << 0
    return new Grade(value)
  }
  get value() { return this.#v }
  set value(value) { return this.#v = value & 0xff }
  get profile() {
    return {
      sight: this.sight,
      shine: this.shine,
      livable: this.livable,
      price: this.price,
    }
  }
  get sight() { return this.#v >> 6 & 0b11 }
  get shine() { return this.#v >> 4 & 0b11 }
  get livable() { return this.#v >> 2 & 0b11 }
  get price() { return this.#v >> 0 & 0b11 }
  toString() { return `${this.sight}-${this.shine}-${this.livable}-${this.price}`}
  /**
   *
   * @param {Grade} a
   * @param {Grade} b
   * @returns {*}
   */
  static distance(a, b) {
    return Math.abs(a.sight - b.sight) * 10 +
      Math.abs(a.shine - b.shine) * 10 +
      Math.abs(a.livable - b.livable) * 10 +
      Math.abs(a.price - b.price) * 10
  }

}

export class Room extends Grade {
  #id
  constructor(id, value) {
    super(value)
    this.#id = id
  }
  static build(id, value) { return new Room(id, value) }
  get serial() { return this.#id }
  get building() { return this.#id.slice(0, 2)}
  get floor() { return this.#id.slice(2, -2) }
  get roomNo() { return this.#id.slice(-2) }
  get unit() { return this.building + '-' + this.roomNo }

  copy() { return new Room(this.#id, this.value) }
  toString() { return `[${this.#id}] ${this.value}`}
}

export class AgentService {
  static preferences(client, rooms, top = 5) {
    const distances = shuffle(rooms.slice()).map(room => {
      const copied = room.copy()
      copied.distance = Grade.distance(client, room)
      return copied
    })
    return distances.sort((a, b) => a.distance - b.distance).slice(0, top)
  }
  static preferenceT1(client, rooms) {
    const vec = AgentService.preferences(client, rooms, 1)
    return vec[0]
  }
}

// sight 
// shine 
// quiet/convenience/feel/fengshui/quality
// price
export const CROSTAB_ROOMS = CrosTab.from(
  {
    head: [ '19-02', '19-01', '18-02', '18-01', '16-02', '16-01' ],
    side: [ '09', '08', '07', '06', '05', '04', '03', '02', '01', ],
    rows: [
      [ 0b11_11_00_00, 0b11_11_00_00, undefined, undefined, 0b11_10_00_00, 0b11_10_00_00 ],
      [ 0b11_11_11_10, 0b11_11_11_10, undefined, undefined, 0b11_10_11_10, 0b11_10_11_10 ],
      [ 0b11_11_11_11, 0b11_11_11_11, undefined, undefined, 0b11_10_11_10, 0b11_10_11_10 ],
      [ 0b10_11_11_10, 0b10_11_11_10, undefined, undefined, 0b10_10_11_10, 0b10_10_11_10 ],
      [ 0b10_11_10_10, 0b10_11_10_10, 0b10_11_10_11, 0b10_11_10_11, 0b10_10_10_01, 0b10_10_10_01 ],
      [ 0b01_11_01_01, 0b01_11_01_01, 0b01_11_11_11, 0b01_11_11_11, 0b01_01_01_00, 0b01_01_01_00 ],
      [ 0b01_10_00_00, 0b01_10_00_00, 0b01_11_10_11, 0b01_11_10_11, 0b01_01_00_00, 0b01_01_00_00 ],
      [ 0b00_10_00_00, 0b00_10_00_00, 0b00_11_01_10, 0b00_11_00_10, 0b00_01_00_00, 0b00_01_00_00 ],
      [ 0b00_11_11_11, 0b00_11_11_11, 0b00_11_11_11, 0b00_11_11_11, 0b00_01_11_11, 0b00_01_11_11 ],
    ]
  }
)

export const LIST_ROOMS = CROSTAB_ROOMS.side.map(
  s => CROSTAB_ROOMS.head.map(
    h => {
      const value = CROSTAB_ROOMS.cell(s, h)
      if (nullish(value)) return null
      const roomId = h.replace(/-/, s)
      return Room.build(roomId, value)
    }
  )
).flat().filter(valid)


LIST_ROOMS.map(o => ( { floor: o.floor, unit: o.unit, grade: o.toString() } )) |> decoSamples|> logger

export const CROSTAB_PRICES = CrosTab.from(
  {
    head: [ '19-02', '19-01', '18-02', '18-01', '16-02', '16-01' ],
    side: [ '09', '08', '07', '06', '05', '04', '03', '02', '01', ],
    rows: [
      [ 230, 228, undefined, undefined, 225, 223 ],
      [ 247, 245, undefined, undefined, 242, 240 ],
      [ 259, 257, undefined, undefined, 253, 251 ],
      [ 253, 251, undefined, undefined, 247, 245 ],
      [ 244, 241, 258, 256, 238, 236 ],
      [ 236, 234, 268, 266, 230, 228 ],
      [ 230, 228, 260, 258, 225, 223 ],
      [ 225, 223, 250, 248, 219, 217 ],
      [ 281, 280, 308, 306, 275, 273 ],
    ]
  }
)


export const LIST_CLIENTS = [
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Vince' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'George' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Bill' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Javier' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Russell' },   // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Philip' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Roberto' },   // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Jude' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Colin' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Robin' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Sean' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Will' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Morgan' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'John' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Ian' },       // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Joaquin' },   // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Mickey' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Matt' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Massimo' },   // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Leonardo' },  // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Terrence' },  // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Quentin' },   // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Tommy' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Don' },       // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Heath' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Jeff' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Ben' },       // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Johnny' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Edward' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, name: 'Ryan' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 0, name: 'Paul' },      // 高楼                      价格敏感
  { sight: 3, shine: 3, livable: 3, price: 0, name: 'Jamie' },     // 高楼                      价格敏感
  { sight: 3, shine: 3, livable: 3, price: 0, name: 'Anthony' },   // 高楼                      价格敏感
  { sight: 3, shine: 3, livable: 3, price: 0, name: 'Gérard' },    // 高楼                      价格敏感
  { sight: 3, shine: 3, livable: 3, price: 0, name: 'Viggo' },     // 高楼                      价格敏感
  { sight: 3, shine: 3, livable: 0, price: 3, name: 'Nick' },      // 高楼            不注重视野
  { sight: 3, shine: 3, livable: 0, price: 3, name: 'Woody' },     // 高楼            不注重视野
  { sight: 3, shine: 3, livable: 0, price: 3, name: 'Robert' },    // 高楼            不注重视野
  { sight: 3, shine: 3, livable: 0, price: 3, name: 'Clint' },     // 高楼            不注重视野
  { sight: 3, shine: 3, livable: 0, price: 3, name: 'Nigel' },     // 高楼            不注重视野
  { sight: 3, shine: 0, livable: 3, price: 3, name: 'David' },     // 高楼  不注重采光
  { sight: 3, shine: 0, livable: 3, price: 3, name: 'Geoffrey' },  // 高楼  不注重采光
  { sight: 3, shine: 0, livable: 3, price: 3, name: 'Brad' },      // 高楼  不注重采光
  { sight: 3, shine: 0, livable: 3, price: 3, name: 'Frank' },     // 高楼  不注重采光
  { sight: 3, shine: 0, livable: 3, price: 3, name: 'Peter' },     // 高楼  不注重采光
  { sight: 0, shine: 3, livable: 3, price: 3, name: 'Jeremy' },    // 一楼
  { sight: 0, shine: 3, livable: 3, price: 3, name: 'Forest' },    // 一楼
  { sight: 0, shine: 3, livable: 3, price: 3, name: 'Ralph' },     // 一楼
  { sight: 0, shine: 3, livable: 3, price: 3, name: 'Tom' },       // 一楼
  { sight: 0, shine: 3, livable: 3, price: 3, name: 'Adrien' },    // 一楼

  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Imelda' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Helen' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Julia' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Joan' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Samantha' },  // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Sandra' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Angelina' },  // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Carey' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Stockard' },  // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Meryl' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Judi' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Frances' },   // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Geena' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Elisabeth' }, // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Cate' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Emma' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Susan' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Mary' },      // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Renée' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Hilary' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Keisha' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Penélope' },  // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Angela' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Helena' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Nicole' },    // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Salma' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Diane' },     // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Julianne' },  // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Charlize' },  // 高楼
  { sight: 3, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Gwyneth' },   // 高楼
  { sight: 3, shine: 3, livable: 3, price: 0, primary: '190501', secondary: '190502', name: 'Naomi' },     // 高楼                      价格敏感
  { sight: 3, shine: 3, livable: 3, price: 0, primary: '190501', secondary: '190502', name: 'Laura' },     // 高楼                      价格敏感
  { sight: 3, shine: 3, livable: 3, price: 0, primary: '190501', secondary: '190502', name: 'Keira' },     // 高楼                      价格敏感
  { sight: 3, shine: 3, livable: 3, price: 0, primary: '190501', secondary: '190502', name: 'Julie' },     // 高楼                      价格敏感
  { sight: 3, shine: 3, livable: 3, price: 0, primary: '190501', secondary: '190502', name: 'Jodie' },     // 高楼                      价格敏感
  { sight: 3, shine: 3, livable: 0, price: 3, primary: '190501', secondary: '190502', name: 'Debra' },     // 高楼            不注重视野
  { sight: 3, shine: 3, livable: 0, price: 3, primary: '190501', secondary: '190502', name: 'Ellen' },     // 高楼            不注重视野
  { sight: 3, shine: 3, livable: 0, price: 3, primary: '190501', secondary: '190502', name: 'Sharon' },    // 高楼            不注重视野
  { sight: 3, shine: 3, livable: 0, price: 3, primary: '190501', secondary: '190502', name: 'Fernanda' },  // 高楼            不注重视野
  { sight: 3, shine: 3, livable: 0, price: 3, primary: '190501', secondary: '190502', name: 'Kate' },      // 高楼            不注重视野
  { sight: 3, shine: 0, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Bette' },     // 高楼  不注重采光
  { sight: 3, shine: 0, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Kathy' },     // 高楼  不注重采光
  { sight: 3, shine: 0, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Jessica' },   // 高楼  不注重采光
  { sight: 3, shine: 0, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Felicity' },  // 高楼  不注重采光
  { sight: 3, shine: 0, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Melissa' },   // 高楼  不注重采光
  { sight: 0, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Janet' },     // 一楼
  { sight: 0, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Miranda' },   // 一楼
  { sight: 0, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Michelle' },  // 一楼
  { sight: 0, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Joanne' },    // 一楼
  { sight: 0, shine: 3, livable: 3, price: 3, primary: '190501', secondary: '190502', name: 'Marion' },    // 一楼
]


const test = () => {
  const CROSTAB_ROOM_GRADES = CROSTAB_ROOMS.map(Grade.build)
  CROSTAB_PRICES |> decoCrostab |> says['room-prices']
  CROSTAB_ROOM_GRADES.map(grade => grade?.toString() ?? '-') |> decoCrostab |> says['room-grades']
  const LIST_CLIENT_GRADES = LIST_CLIENTS.map(o => {
    const grade = Grade.from(o)
    grade.name = o.name
    return grade
  })
  // LIST_CLIENT_GRADES |> DecoSamples({ read: x => x.toString() }) |> logger
  // const LIST_ROOM_SAMPLES =

  const preferencesT5 = LIST_CLIENT_GRADES.map(client => {
    const name = client.name
    const rooms = AgentService.preferences(client, LIST_ROOMS).map(x => `[${x.serial}] ${x.distance}`)
    return { name, rooms }
  })
  // preferencesT5 |> decoSamples |> logger
  const preferencesT1 = LIST_CLIENT_GRADES.map(client => {
    const name = client.name
    const room = AgentService.preferenceT1(client, LIST_ROOMS)
    return { name, room }
  })
  // preferencesT1.map(({ name, room: { serial, distance } }) => ( { name, serial, distance } )) |> decoSamples |> says['top-of-mind']

  const crostabFallIn = CROSTAB_PRICES.copy({ rows: mapper(CROSTAB_PRICES.rows, x => valid(x) ? [] : null) })
  for (let { name, room } of preferencesT1) {
    crostabFallIn.cell(room.floor, room.unit)?.push(name)
  }
  crostabFallIn.map(x => x?.length) |> decoCrostab |> says['round-1 pick']
}

test()