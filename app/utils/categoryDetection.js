// Automatic Category Detection Utility
// Detects item categories based on name patterns and keywords

import { CATEGORIES } from './categoryUtils';

// Category keywords for automatic detection
const CATEGORY_KEYWORDS = {
  [CATEGORIES.COMPONENT]: [
    // Electronic components
    'resistor', 'capacitor', 'inductor', 'diode', 'transistor', 'ic', 'chip',
    'led', 'rgb', 'sensor', 'module', 'board', 'pcb', 'circuit', 'microcontroller',
    'arduino', 'esp32', 'esp8266', 'raspberry', 'pi', 'mcu', 'cpu', 'memory',
    'ram', 'rom', 'flash', 'crystal', 'oscillator', 'relay', 'switch', 'button',
    'connector', 'jack', 'plug', 'socket', 'wire', 'cable', 'fuse', 'breaker',
    'battery', 'cell', 'power', 'supply', 'voltage', 'current', 'ohm', 'farad',
    'henry', 'watt', 'amp', 'volt', 'khz', 'mhz', 'ghz', 'hz', 'timing',
    'clock', 'timer', 'counter', 'register', 'logic', 'gate', 'buffer', 'driver',
    'converter', 'regulator', 'stabilizer', 'filter', 'amplifier', 'op-amp',
    'comparator', 'multiplexer', 'demultiplexer', 'encoder', 'decoder', 'adc',
    'dac', 'display', 'screen', 'lcd', 'oled', 'segment', 'matrix', 'touch',
    'motor', 'servo', 'stepper', 'actuator', 'solenoid', 'coil', 'transformer',
    'induction', 'heatsink', 'fan', 'cooling', 'thermal', 'temperature', 'humidity',
    'pressure', 'motion', 'accelerometer', 'gyroscope', 'magnetometer', 'gps',
    'bluetooth', 'wifi', 'rf', 'radio', 'antenna', 'modem', 'ethernet', 'usb',
    'serial', 'spi', 'i2c', 'uart', 'can', 'rs232', 'rs485', 'hdmi', 'vga',
    'audio', 'speaker', 'microphone', 'buzzer', 'alarm', 'siren', 'camera',
    'ir', 'infrared', 'laser', 'ultrasonic', 'radar', 'lidar', 'biometric',
    'fingerprint', 'face', 'iris', 'nfc', 'rfid', 'barcode', 'qr', 'scanner'
  ],
  [CATEGORIES.PRODUCT]: [
    // Complete products and assemblies
    'phone', 'smartphone', 'tablet', 'laptop', 'computer', 'desktop', 'monitor',
    'tv', 'television', 'camera', 'video', 'recorder', 'player', 'speaker',
    'headphone', 'earphone', 'earbud', 'headset', 'microphone', 'keyboard',
    'mouse', 'trackpad', 'gamepad', 'controller', 'console', 'router', 'modem',
    'printer', 'scanner', 'copier', 'fax', 'projector', 'dock', 'hub',
    'charger', 'adapter', 'cable', 'case', 'cover', 'stand', 'mount', 'bracket',
    'lamp', 'light', 'bulb', 'fixture', 'clock', 'watch', 'timer', 'thermostat',
    'remote', 'sensor', 'detector', 'alarm', 'camera', 'doorbell', 'lock',
    'switch', 'outlet', 'plug', 'socket', 'extension', 'power', 'strip', 'surge',
    'battery', 'pack', 'bank', 'solar', 'panel', 'inverter', 'generator',
    'appliance', 'refrigerator', 'freezer', 'oven', 'microwave', 'dishwasher',
    'washer', 'dryer', 'vacuum', 'cleaner', 'mop', 'iron', 'toaster', 'blender',
    'mixer', 'grinder', 'coffee', 'maker', 'kettle', 'fan', 'heater', 'cooler',
    'air', 'conditioner', 'purifier', 'humidifier', 'dehumidifier', 'massager',
    'shaver', 'trimmer', 'dryer', 'straightener', 'toothbrush', 'floss',
    'scale', 'thermometer', 'blood', 'pressure', 'glucose', 'meter', 'test',
    'kit', 'set', 'bundle', 'package', 'system', 'unit', 'device', 'machine',
    'equipment', 'apparatus', 'instrument', 'tool', 'gadget', 'widget', 'device'
  ],
  [CATEGORIES.TOOL]: [
    // Tools and equipment
    'screwdriver', 'drill', 'hammer', 'wrench', 'plier', 'cutter', 'knife',
    'saw', 'file', 'grinder', 'sander', 'polisher', 'buffer', 'router', 'jointer',
    'planer', 'lathe', 'mill', 'press', 'clamp', 'vise', 'stand', 'bench',
    'workbench', 'toolbox', 'chest', 'case', 'bag', 'organizer', 'holder',
    'rack', 'shelf', 'storage', 'cabinet', 'drawer', 'bin', 'box', 'container',
    'multimeter', 'tester', 'meter', 'probe', 'scope', 'oscilloscope', 'analyzer',
    'generator', 'signal', 'function', 'power', 'supply', 'source', 'load',
    'soldering', 'iron', 'station', 'gun', 'desoldering', 'wick', 'pump',
    'hot', 'air', 'rework', 'tweezer', 'pickup', 'vacuum', 'magnifier', 'microscope',
    'lamp', 'light', 'magnifying', 'glass', 'loupe', 'inspection', 'microscope',
    'caliper', 'micrometer', 'gauge', 'ruler', 'tape', 'measure', 'level', 'square',
    'angle', 'protractor', 'compass', 'divider', 'marking', 'punch', 'center',
    'drift', 'pin', 'chisel', 'punch', 'stamp', 'die', 'tap', 'thread', 'die',
    'reamer', 'broach', 'honing', 'lapping', 'grinding', 'polishing', 'buffing',
    'cleaning', 'brush', 'cloth', 'wipe', 'solvent', 'degreaser', 'alcohol',
    'acetone', 'thinner', 'remover', 'stripper', 'adhesive', 'glue', 'epoxy',
    'sealant', 'caulk', 'tape', 'film', 'sheet', 'foil', 'paper', 'cloth',
    'safety', 'glasses', 'goggles', 'glove', 'mask', 'respirator', 'helmet',
    'ear', 'protection', 'plug', 'muff', 'apron', 'vest', 'boot', 'shoe'
  ]
};

// Product-specific keywords for more specific categorization
const PRODUCT_SPECIFIC_KEYWORDS = {
  'EROV PRODUCT': [
    'erov', 'e-rov', 'electronic', 'rov', 'remote', 'operated', 'vehicle',
    'underwater', 'marine', 'submarine', 'aquatic', 'ocean', 'sea', 'water',
    'propulsion', 'thruster', 'propeller', 'impeller', 'pump', 'valve',
    'hull', 'frame', 'chassis', 'body', 'shell', 'enclosure', 'housing',
    'navigation', 'guidance', 'control', 'autopilot', 'gps', 'sonar', 'echo',
    'sounder', 'depth', 'finder', 'fish', 'finder', 'camera', 'light', 'led',
    'laser', 'sensor', 'pressure', 'temperature', 'flow', 'speed', 'current',
    'voltage', 'power', 'battery', 'communication', 'radio', 'modem', 'antenna',
    'cable', 'connector', 'harness', 'wiring', 'circuit', 'board', 'pcb'
  ],
  'JSUMO_PRODUCT': [
    'jsumo', 'j-sumo', 'robot', 'sumo', 'autonomous', 'competition', 'battle',
    'wrestling', 'pushing', 'shoving', 'ring', 'dojo', 'arena', 'tournament',
    'contest', 'fight', 'combat', 'strategy', 'programming', 'algorithm',
    'sensor', 'ultrasonic', 'infrared', 'line', 'edge', 'detection', 'color',
    'camera', 'vision', 'image', 'processing', 'motor', 'wheel', 'tire', 'track',
    'chassis', 'frame', 'body', 'armor', 'shield', 'weapon', 'blade', 'spike',
    'flipper', 'lifter', 'arm', 'grabber', 'claw', 'gripper', 'scoop',
    'battery', 'power', 'supply', 'voltage', 'current', 'controller', 'mcu',
    'arduino', 'esp', 'raspberry', 'pi', 'wireless', 'bluetooth', 'wifi', 'rf',
    'remote', 'control', 'app', 'interface', 'display', 'screen', 'lcd', 'oled',
    'led', 'light', 'sound', 'buzzer', 'speaker', 'audio', 'feedback', 'status'
  ],
  'ZM_ROBO_PRODUCT': [
    'zm', 'robo', 'robotics', 'automation', 'industrial', 'manufacturing',
    'assembly', 'production', 'factory', 'warehouse', 'logistics', 'material',
    'handling', 'conveyor', 'belt', 'sorter', 'picker', 'placer', 'packager',
    'palletizer', 'depalletizer', 'agv', 'amr', 'forklift', 'crane', 'hoist',
    'lift', 'elevator', 'conveyor', 'system', 'robot', 'arm', 'manipulator',
    'end', 'effector', 'gripper', 'tool', 'changer', 'wrist', 'elbow', 'shoulder',
    'base', 'pedestal', 'mount', 'actuator', 'servo', 'motor', 'drive', 'gear',
    'transmission', 'chain', 'belt', 'pulley', 'bearing', 'shaft', 'coupling',
    'brake', 'clutch', 'encoder', 'resolver', 'tachometer', 'limit', 'switch',
    'sensor', 'proximity', 'photoelectric', 'laser', 'ultrasonic', 'inductive',
    'capacitive', 'magnetic', 'vision', 'camera', 'system', 'controller', 'plc',
    'hmi', 'scada', 'interface', 'panel', 'touch', 'screen', 'display', 'monitor',
    'network', 'ethernet', 'profibus', 'modbus', 'can', 'device', 'net', 'fieldbus'
  ]
};

/**
 * Detect category based on item name
 * @param {string} itemName - The name of the item to categorize
 * @returns {string} - Detected category
 */
export const detectCategory = (itemName) => {
  if (!itemName || typeof itemName !== 'string') {
    return CATEGORIES.OTHERS;
  }

  const name = itemName.toLowerCase().trim();
  
  // Check product-specific categories first (more specific)
  for (const [productCategory, keywords] of Object.entries(PRODUCT_SPECIFIC_KEYWORDS)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return productCategory;
    }
  }
  
  // Check general categories
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }
  
  // If no keywords match, try pattern-based detection
  return detectCategoryByPattern(name);
};

/**
 * Detect category based on naming patterns
 * @param {string} itemName - Lowercase item name
 * @returns {string} - Detected category
 */
const detectCategoryByPattern = (itemName) => {
  // Component patterns
  const componentPatterns = [
    /^[a-z]+\d+[a-z]*$/i,  // R123, C10, LM358, ATmega328
    /^\d+[a-z]+$/i,         // 1N4007, 2N2222
    /^[a-z]{2,4}\d{3,4}$/i,  // BC547, 2N3904
    /\b\d+[kw]?\b/,         // 10k, 1k, 4.7k, 100w
    /\b\d+\.?\d*[ufnm]?[hf]\b/i,  // 100uf, 10nF, 1MHz
    /\b\d+v\b/i,            // 12V, 5V, 3.3V
    /\b\d+a\b/i,            // 2A, 500mA
    /\b\d+w\b/i,            // 5W, 10W
    /\b\d+m?hz\b/i,         // 16MHz, 2.4GHz
    /\b\d+oh?m?\b/i,        // 10ohm, 1kohm
  ];
  
  // Product patterns
  const productPatterns = [
    /\b(phone|tablet|laptop|computer|monitor|tv|camera|printer|router)\b/i,
    /\b(speaker|headphone|keyboard|mouse|gamepad|controller)\b/i,
    /\b(charger|adapter|cable|case|cover|stand|mount)\b/i,
    /\b(appliance|refrigerator|oven|washer|dryer|vacuum)\b/i,
    /\b(kit|set|bundle|package|system|unit|device)\b/i,
  ];
  
  // Tool patterns
  const toolPatterns = [
    /\b(screwdriver|drill|hammer|wrench|plier|cutter|knife)\b/i,
    /\b(multimeter|tester|meter|scope|analyzer|generator)\b/i,
    /\b(soldering|iron|station|gun|tweezer|microscope)\b/i,
    /\b(caliper|micrometer|gauge|ruler|tape|measure|level)\b/i,
  ];
  
  if (componentPatterns.some(pattern => pattern.test(itemName))) {
    return CATEGORIES.COMPONENT;
  }
  
  if (productPatterns.some(pattern => pattern.test(itemName))) {
    return CATEGORIES.PRODUCT;
  }
  
  if (toolPatterns.some(pattern => pattern.test(itemName))) {
    return CATEGORIES.TOOL;
  }
  
  return CATEGORIES.OTHERS;
};

/**
 * Get category detection confidence score
 * @param {string} itemName - The name of the item
 * @param {string} category - The detected category
 * @returns {number} - Confidence score (0-1)
 */
export const getCategoryConfidence = (itemName, category) => {
  if (!itemName || !category) return 0;
  
  const name = itemName.toLowerCase().trim();
  let matches = 0;
  let totalKeywords = 0;
  
  // Check product-specific keywords first (higher weight)
  if (Object.values(PRODUCT_SPECIFIC_KEYWORDS).flat().some(k => name.includes(k))) {
    return 0.9; // High confidence for product-specific matches
  }
  
  // Check general category keywords
  if (CATEGORY_KEYWORDS[category]) {
    totalKeywords = CATEGORY_KEYWORDS[category].length;
    matches = CATEGORY_KEYWORDS[category].filter(keyword => name.includes(keyword)).length;
  }
  
  if (totalKeywords === 0) return 0;
  
  const baseConfidence = matches / totalKeywords;
  
  // Boost confidence for pattern matches
  if (detectCategoryByPattern(name) === category) {
    return Math.min(1, baseConfidence + 0.3);
  }
  
  return baseConfidence;
};

/**
 * Get all possible categories with confidence scores
 * @param {string} itemName - The name of the item
 * @returns {Array} - Array of {category, confidence} objects
 */
export const getAllCategoryScores = (itemName) => {
  if (!itemName) return [];
  
  const scores = [];
  
  // Check all categories
  for (const category of Object.values(CATEGORIES)) {
    const confidence = getCategoryConfidence(itemName, category);
    if (confidence > 0) {
      scores.push({ category, confidence });
    }
  }
  
  // Check product-specific categories
  for (const productCategory of Object.keys(PRODUCT_SPECIFIC_KEYWORDS)) {
    const keywords = PRODUCT_SPECIFIC_KEYWORDS[productCategory];
    const name = itemName.toLowerCase().trim();
    const matches = keywords.filter(keyword => name.includes(keyword)).length;
    const confidence = matches / keywords.length;
    
    if (confidence > 0) {
      scores.push({ category: productCategory, confidence: confidence + 0.2 }); // Boost product-specific
    }
  }
  
  // Sort by confidence (highest first)
  return scores.sort((a, b) => b.confidence - a.confidence);
};

export default {
  detectCategory,
  getCategoryConfidence,
  getAllCategoryScores,
  CATEGORY_KEYWORDS,
  PRODUCT_SPECIFIC_KEYWORDS
};
