import type { PortraitStyle, PromptModuleCategory } from "./types";

export const COMPILER_VERSION = "1.0.0";

export const IDENTITY_PRESERVATION = `Preserve the subject's exact identity with very high fidelity.

Maintain the original facial geometry, face shape, eye shape and spacing, nose structure, mouth shape, jawline, skin tone, apparent age, ethnicity, hairline, facial asymmetry and distinctive natural characteristics.

The result must clearly depict the same real person. Do not beautify the subject into another face. Do not standardize the face toward an idealized beauty template. Do not significantly enlarge the eyes, reshape the nose, mouth, jaw or eyebrows, slim the face, change the person's age, alter the natural skin tone, or remove distinctive natural features.

Only change photography-related elements such as lighting, background, clothing, posture, grooming, framing and subtle natural expression.`;

export const NEGATIVE_RULES = `Do not change the subject's identity.
Do not create a different face or significantly change apparent age.
Do not enlarge the eyes or reshape the nose, lips, jawline or eyebrows.
Do not significantly slim the face or body.
Do not alter natural skin tone or ethnicity.
Do not erase distinctive facial features.
Do not create plastic skin, excessive beauty retouching or unrealistic facial symmetry.
Do not create fake teeth, exaggerated smiles, malformed ears, shoulders, clothing or jewelry.
Do not duplicate accessories or create melted hair edges.
Do not create artificial HDR, dramatic cinematic lighting, glamour photography or fashion editorial posing.
Do not use visible logos, text, signatures, watermarks or borders in the master image.
Do not create an obviously synthetic office background.
The result must look photographed, not generated.`;

export const PROMPT_ORDER: PromptModuleCategory[] = [
  "identity",
  "career_identity",
  "composition",
  "pose",
  "expression",
  "camera",
  "lens",
  "lighting",
  "background",
  "wardrobe",
  "hair",
  "skin",
  "color",
  "retouch",
  "rendering",
  "output",
  "negative",
];

const common = {
  hair: "Keep the subject's real hairline, density and individual hair strands. Use neat, natural professional grooming without changing identity.",
  skin: "Preserve authentic skin texture, fine pores, subtle tonal variation, natural facial asymmetry and small expression lines.",
  output: "Create one portrait-oriented commercial image at high resolution with realistic photographic detail and a clean finish.",
};

export const PORTRAIT_STYLES: PortraitStyle[] = [
  {
    id: "style_quiet_executive",
    slug: "quiet-executive-signature",
    publicName: "Quiet Executive Signature",
    publicNameZh: "静默领导者",
    internalReferenceName: "apple_executive_reference",
    description: "极简、克制且高智感的科技管理层形象。浅灰蓝背景与柔和棚拍让注意力只落在人物本身。",
    version: "1.0",
    status: "active",
    accent: "#9BC4D8",
    traits: ["安静自信", "极简科技", "真实皮肤"],
    modules: {
      identity: IDENTITY_PRESERVATION,
      career_identity: "Create a premium minimalist executive portrait for the leadership page of a world-class technology company. Communicate intelligence, clarity, trust and quiet confidence.",
      composition: "Use an upper half-body composition with elegant negative space and minimal visual distraction.",
      pose: "Turn the shoulders approximately 15 degrees away from camera, with the head gently returned toward the lens. Keep posture calm and upright.",
      expression: "Create calm, focused direct eye contact, relaxed facial muscles and a restrained genuine smile.",
      camera: "Use authentic high-end commercial studio photography with realistic optical rendering.",
      lens: "Use a natural 105mm executive portrait perspective with gentle compression and no wide-angle facial distortion.",
      lighting: "Use soft, highly diffused directional light: a large soft key, subtle fill and extremely restrained rim light. Preserve natural catchlights.",
      background: "Use a clean, smooth cool gray to blue-gray gradient background. No texture, office furniture, architecture or clutter.",
      wardrobe: "Use minimalist, premium, unbranded wardrobe in black, navy or charcoal. Keep jewelry small and unobtrusive.",
      hair: common.hair,
      skin: common.skin,
      color: "Use neutral, slightly desaturated grading, soft contrast, clean highlights and natural skin tones.",
      retouch: "Apply only restrained commercial retouching. Never beauty-filter or remove lived-in facial detail.",
      rendering: "The final image must look professionally photographed, not generated.",
      output: common.output,
      negative: NEGATIVE_RULES,
    },
  },
  {
    id: "style_global_professional",
    slug: "global-professional-signature",
    publicName: "Global Professional Signature",
    publicNameZh: "国际职业形象",
    internalReferenceName: "linkedin_premium_reference",
    description: "可信、亲和、国际化。自然窗光和低饱和办公环境，适合顾问、产品负责人和全球业务角色。",
    version: "1.0",
    status: "active",
    accent: "#8FB5AE",
    traits: ["可信亲和", "国际化", "现代办公"],
    modules: {
      identity: IDENTITY_PRESERVATION,
      career_identity: "Create a premium international professional profile portrait for a senior employee, consultant, product leader or global business professional. Communicate competence, trust, openness and collaboration.",
      composition: "Use an upper half-body commercial profile composition with gentle background separation.",
      pose: "Turn the body approximately 20 degrees and direct the head naturally toward camera. Keep shoulders relaxed and posture open.",
      expression: "Create focused, confident eye contact with a natural genuine smile. The subject should appear intelligent, trustworthy and easy to work with.",
      camera: "Use realistic contemporary corporate photography with natural dimensionality.",
      lens: "Use a realistic 85mm commercial portrait perspective with natural facial proportions.",
      lighting: "Use soft directional morning window light with a subtle difference between illuminated and shaded sides of the face.",
      background: "Suggest a clean contemporary professional environment through softly blurred glass, neutral architectural lines and daylight. Avoid logos, obvious furniture and staged stock-photo elements.",
      wardrobe: "Use restrained professional clothing with clean tailoring and minimal accessories.",
      hair: common.hair,
      skin: "Preserve pores, fine expression lines, lip texture, subtle under-eye detail and realistic hair edges.",
      color: "Use a low-saturation blue-gray and warm-neutral color palette.",
      retouch: "Use natural corporate retouching without beauty-filter smoothing.",
      rendering: "The image must appear photographed by a professional corporate photographer, not AI generated.",
      output: common.output,
      negative: NEGATIVE_RULES,
    },
  },
  {
    id: "style_boardroom_leadership",
    slug: "boardroom-leadership-signature",
    publicName: "Boardroom Leadership Signature",
    publicNameZh: "高管领导力",
    internalReferenceName: "fortune500_executive_reference",
    description: "沉稳、权威但不强势。经典三点布光和更深的中性层次，适合高管主页与年度报告。",
    version: "1.0",
    status: "active",
    accent: "#C2A584",
    traits: ["权威沉稳", "经典布光", "更深层次"],
    modules: {
      identity: IDENTITY_PRESERVATION,
      career_identity: "Create a premium boardroom leadership portrait for the leadership page or annual report of a respected global company. Communicate leadership, integrity, judgment, responsibility and executive presence.",
      composition: "Use a composed upper half-body portrait with a formal but human balance.",
      pose: "Turn the body approximately 15 to 20 degrees and return the head confidently toward camera.",
      expression: "Create steady direct eye contact, relaxed facial muscles and a warm but restrained expression: authority without aggression, experience without stiffness.",
      camera: "Use commissioned high-end executive photography with controlled tonal transitions.",
      lens: "Use a natural 105mm executive portrait perspective.",
      lighting: "Apply classic three-point commercial lighting: a large soft key, gentle fill and subtle rim light separating hair and shoulders. Keep shadows controlled.",
      background: "Use a smooth charcoal, neutral gray or restrained gray-blue studio background without decorative texture or dramatic gradients.",
      wardrobe: "Use premium tailoring, matte fabrics, clean lines and no branding. Keep accessories minimal.",
      hair: common.hair,
      skin: "Retain authentic facial structure, age, skin texture, expression lines and subtle asymmetry.",
      color: "Use controlled contrast, neutral color science and a slightly deeper tonal range than a standard profile image.",
      retouch: "Retouch only temporary distractions while preserving the subject's lived-in credibility.",
      rendering: "It must look like a real high-end corporate photography commission.",
      output: common.output,
      negative: NEGATIVE_RULES,
    },
  },
  {
    id: "style_founder_studio",
    slug: "founder-studio-signature",
    publicName: "Founder Studio Signature",
    publicNameZh: "创业者工作室",
    internalReferenceName: "yc_founder_reference",
    description: "聪明、好奇、自然有行动力。下午窗光与轻微环境感，像现代公司的创始人主页，而不是传统高管照。",
    version: "1.0",
    status: "active",
    accent: "#C6B8D8",
    traits: ["聪明好奇", "自然松弛", "创意空间"],
    modules: {
      identity: IDENTITY_PRESERVATION,
      career_identity: "Create a premium modern founder portrait. The subject should appear like a thoughtful builder, creator or technology founder rather than a traditional corporate executive. Communicate curiosity, optimism, competence and creative energy.",
      composition: "Use a relaxed upper half-body environmental portrait with elegant depth of field.",
      pose: "Use a subtle body angle, natural shoulder asymmetry and calm upright posture.",
      expression: "Create bright, focused eyes and an authentic understated smile.",
      camera: "Use natural environmental portrait photography that feels discovered rather than constructed.",
      lens: "Use a realistic 85mm environmental portrait perspective with natural optical rendering.",
      lighting: "Use soft afternoon window light with subtle directional modeling and gentle warmth.",
      background: "Suggest a refined minimal creative workspace with softly blurred pale walls, glass, neutral materials and very subtle greenery. Avoid logos, obvious computers, neon signs and startup clichés.",
      wardrobe: "Use modern, intelligent and relaxed clothing: clean knitwear, a minimalist shirt, understated tailoring or a refined dress. Avoid stereotypical hoodies.",
      hair: common.hair,
      skin: "Retain natural skin texture, hair movement, facial asymmetry and realistic expression detail.",
      color: "Use a clean modern neutral palette with gentle warmth and low saturation.",
      retouch: "Use editorial commercial retouching, not beauty retouching.",
      rendering: "It should look like a real portrait photographed for the homepage of a highly regarded modern company.",
      output: common.output,
      negative: NEGATIVE_RULES,
    },
  },
];

export function getStyle(styleId: string, version = "1.0") {
  const style = PORTRAIT_STYLES.find((item) => item.id === styleId);
  if (!style || style.version !== version || style.status !== "active") {
    throw new Error("所选 Portrait DNA 版本不存在、尚未发布或已停用。");
  }
  return style;
}

