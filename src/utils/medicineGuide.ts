import type { MedicalKitItem } from '../types/telemetry';

export function getMedicineCareGuide(item: MedicalKitItem): {
  title: string;
  steps: string[];
} {
  const combined = `${item.name} ${item.purpose}`.toLowerCase();

  if (item.stock > 0) {
    return {
      title: `How to Use ${item.name} (${item.stock} ${item.unit} left)`,
      steps: [
        `Use ${item.name} only for its purpose: ${item.purpose}.`,
        `Take 1 ${item.unit.replace(/s$/, '') || 'dose'} with water if needed, and tap "-" above to update your stock.`,
        'If symptoms stay or get worse, ask the AI Doctor or send an update to NASA Ground Control.',
      ],
    };
  }

  if (
    /headache|pain|ache|migraine|sore|muscle|back|fever|analgesic|ibuprofen|tylenol|paracetamol/.test(
      combined
    )
  ) {
    return {
      title: `Medicine-Free Guide for ${item.purpose} (0 ${item.name} left)`,
      steps: [
        'Put a cool, damp cloth on your forehead or sore spot for 15 minutes.',
        'Dim bright cabin lights and rest your eyes away from screens.',
        'Open Relax & Games for slow 4-4-4-4 breathing and sip plain water slowly.',
      ],
    };
  }

  if (/nausea|stomach|motion|dizzy|vertigo|vomit|upset|digest/.test(combined)) {
    return {
      title: `Medicine-Free Guide for ${item.purpose} (0 ${item.name} left)`,
      steps: [
        'Look at one still wall in front of you and avoid quick head turns.',
        'Point a gentle cool air vent toward your face and chest.',
        'Breathe in for 4 seconds and out for 6 seconds, taking tiny sips of cool water.',
      ],
    };
  }

  if (/sleep|insomnia|rest|tired|awake|melatonin|calm|stress|anxiety/.test(combined)) {
    return {
      title: `Medicine-Free Guide for ${item.purpose} (0 ${item.name} left)`,
      steps: [
        'Switch cabin lights to warm dim mode and wear a sleep mask.',
        'Use Relax & Games (4-4-4-4 Breathing or Starlight Drift) for 5 minutes before bed.',
        'Put away bright screens and avoid caffeine for 90 minutes before sleep.',
      ],
    };
  }

  if (/water|hydrat|electrolyte|salt|cramp|thirst|dry|rehydrat/.test(combined)) {
    return {
      title: `Medicine-Free Guide for ${item.purpose} (0 ${item.name} left)`,
      steps: [
        'Sip 300–400 ml of plain water slowly over 20 minutes.',
        'Eat a lightly salted snack or warm broth pouch to help your body hold water.',
        'Rest quietly in your bunk for 10 minutes and pause hard workouts.',
      ],
    };
  }

  if (/cut|wound|burn|bandage|antiseptic|skin|rash|cream|first aid/.test(combined)) {
    return {
      title: `Medicine-Free Guide for ${item.purpose} (0 ${item.name} left)`,
      steps: [
        'Wash the area gently with clean potable water and a clean dry cloth.',
        'Cover the spot lightly with clean gauze or tape to keep floating dust out.',
        'Keep the area dry and ask the AI Doctor if redness or pain grows.',
      ],
    };
  }

  return {
    title: `Medicine-Free Guide for ${item.purpose} (0 ${item.name} left)`,
    steps: [
      `Because ${item.name} is at 0, pause heavy work and rest quietly in a calm cabin area.`,
      'Drink a glass of water slowly and use Relax & Games to keep your heart rate steady.',
      'Message the AI Doctor with your exact symptoms for custom backup care.',
    ],
  };
}

export function findKitMatchForQuery(
  query: string,
  medicalKit: MedicalKitItem[]
): MedicalKitItem | undefined {
  const q = query.toLowerCase();
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

  let bestItem: MedicalKitItem | undefined;
  let bestScore = 0;

  for (const item of medicalKit) {
    const target = `${item.name} ${item.purpose}`.toLowerCase();
    let score = 0;

    for (const w of words) {
      if (target.includes(w)) score += 3;
    }

    if (
      /headache|pain|ache|migraine|sore|fever/.test(q) &&
      /pain|headache|ache|migraine|fever|analgesic|ibuprofen|paracetamol|tylenol/.test(target)
    ) {
      score += 4;
    }
    if (
      /nausea|stomach|dizzy|vertigo|vomit|sick/.test(q) &&
      /nausea|stomach|motion|dizzy|vertigo|upset|ondansetron/.test(target)
    ) {
      score += 4;
    }
    if (
      /sleep|insomnia|awake|tired|restless/.test(q) &&
      /sleep|insomnia|rest|melatonin|calm/.test(target)
    ) {
      score += 4;
    }
    if (
      /dehydrat|thirst|cramp|water|dry|electrolyte/.test(q) &&
      /water|hydrat|electrolyte|salt|cramp|rehydrat/.test(target)
    ) {
      score += 4;
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestScore > 0 ? bestItem : undefined;
}
