import type { PortraitStyle, PromptModuleCategory } from "./types";

export const COMPILER_VERSION_V1 = "1.0.0";
export const COMPILER_VERSION_V2 = "2.0.0";
export const COMPILER_VERSION = COMPILER_VERSION_V2;

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

export const PROMPT_ORDER_V1: PromptModuleCategory[] = [
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

export const PROMPT_ORDER_V2: PromptModuleCategory[] = [
  "identity",
  "source_interpretation",
  "pose_normalization",
  "gaze",
  "expression",
  "presence",
  "hair_grooming",
  "career_identity",
  "wardrobe",
  "composition",
  "camera",
  "lens",
  "lighting",
  "background",
  "skin",
  "color",
  "retouch",
  "rendering",
  "output",
  "negative",
];

export const PROMPT_ORDER = PROMPT_ORDER_V2;

const common = {
  hair: "Keep the subject's real hairline, density and individual hair strands. Use neat, natural professional grooming without changing identity.",
  skin: "Preserve authentic skin texture, fine pores, subtle tonal variation, natural facial asymmetry and small expression lines.",
  output: "Create one portrait-oriented commercial image at high resolution with realistic photographic detail and a clean finish.",
};

export const PORTRAIT_STYLES_V1: PortraitStyle[] = [
  {
    id: "style_quiet_executive",
    slug: "quiet-executive-signature",
    publicName: "Quiet Executive Signature",
    publicNameZh: "静默领导者",
    internalReferenceName: "apple_executive_reference",
    description: "极简、克制且高智感的科技管理层形象。浅灰蓝背景与柔和棚拍让注意力只落在人物本身。",
    version: "1.0",
    engineVersion: "1.0",
    status: "retired",
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
    engineVersion: "1.0",
    status: "retired",
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
    engineVersion: "1.0",
    status: "retired",
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
    engineVersion: "1.0",
    status: "retired",
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

export const IDENTITY_PRESERVATION_V2 = `Preserve the subject's exact identity with very high fidelity.

Maintain the original facial geometry, face shape, natural eye shape and spacing, nose structure, mouth shape, jawline, natural skin tone, apparent age, ethnicity, hairline, facial asymmetry and distinctive personal characteristics.

The final portrait must clearly depict the same real person.

Do not beautify or standardize the subject into another face. Do not enlarge the eyes. Do not reshape the nose, lips, eyebrows, jawline or face shape. Do not significantly slim the face. Do not change the person's apparent age. Do not alter the natural skin tone, ethnicity or distinctive facial characteristics.

Only change photography-related elements such as gaze, expression, pose, lighting, wardrobe, grooming, framing and background.`;

export const SOURCE_IMAGE_IDENTITY_ONLY_V2 = `Use the reference image only as an identity source.

Do not treat the original image as a pose, lighting, composition, expression or camera-angle template.

Ignore the original selfie angle, head tilt, body lean, camera height, background, lighting and emotional weakness.

Extract and preserve who the subject is, then recompose the portrait according to professional commercial photography standards.`;

export const PROFESSIONAL_POSE_NORMALIZATION_V2 = `Ignore the pose and camera angle of the reference image.

Preserve only the subject's identity.

Recompose the portrait using professional commercial portrait standards.

Position the torso approximately 15 degrees away from the camera.

Return the head naturally toward the camera so that the face appears nearly frontal.

Keep the head level, with no visible tilt. Place the camera at eye level. Maintain direct eye contact.

Keep the shoulders relaxed, balanced and naturally open.

Position the chin slightly forward and slightly down.

Create an upright, grounded and composed posture.

Do not preserve the original selfie angle, head tilt, body lean, raised shoulders, collapsed posture or distorted camera perspective.`;

export const PROFESSIONAL_GAZE_V2 = `Preserve the subject's natural eye shape and eyelid anatomy exactly.

Do not enlarge or reshape the eyes. Adjust only the emotional quality of the gaze.

Create calm, steady, focused and fully present direct eye contact.

The gaze should feel grounded, emotionally stable and professionally confident.

Remove any timid, hesitant, vacant, overly soft, fragile or uncertain quality from the original expression.

Avoid aggression, intimidation, coldness, excessive intensity or an artificial stare.

The eyes should communicate clarity, attentiveness, confidence and trust.`;

export const PROFESSIONAL_EXPRESSION_V2 = `Create a subtle, controlled and natural professional expression.

Relax the jaw and facial muscles.

Use a restrained genuine smile expressed mainly through slight mouth-corner lift and gentle engagement around the eyes.

Avoid a broad commercial smile, forced teeth, pursed lips, blank expression, excessive seriousness or visible facial tension.

The expression should feel intelligent, composed, emotionally mature and appropriate to the selected professional identity.`;

export const PROFESSIONAL_PRESENCE_V2 = `Create a strong but natural sense of professional presence.

The subject should appear fully present, grounded, composed and worthy of attention.

Build presence through stable posture, clear eye contact, balanced head-and-shoulder alignment, controlled expression, confident use of visual space and professionally appropriate styling.

The portrait should communicate judgment, credibility, emotional maturity and quiet self-possession.

Do not create presence through aggression, hardness, intimidation, exaggerated seriousness, theatrical posing or artificial dominance.

The subject should feel substantial and memorable without appearing self-important.`;

export const PROFESSIONAL_HAIR_GROOMING_V2 = `Preserve the subject's natural hairstyle, haircut, hairline, hair length and hair color.

Do not change the hairstyle into a different fashion look.

Increase the visible sense of hair volume subtly and realistically.

Create gentle lift at the roots and crown, natural fullness around the sides and soft layered separation between individual strands.

Reduce flatness around the scalp while preserving believable hair density.

Frame the face cleanly without covering too much of the forehead, eyes or cheeks.

Keep realistic individual hair strands and a small amount of natural flyaway hair.

The hair should look professionally groomed, healthy, naturally full and photographically refined.

Avoid flat hair, oily roots, exaggerated salon volume, artificial curls, helmet-like shape, excessive symmetry, glossy wig texture or melted hair edges.

Do not change the hairline.`;

export const COMPOSITION_STANDARD_V2 = `Use an upper-torso or chest-up composition. Keep appropriate headroom. Place the eyes near the upper third of the frame. Keep the shoulders visible but not dominant. Do not use a rigid passport-photo composition. Do not crop the top of the head. Hands should normally remain outside the frame unless explicitly required by the style.

Create clean and balanced face framing. Allow appropriate forehead visibility. Keep natural air and separation around the hair. Do not press the hair tightly against the face. Maintain clean visual space beneath the chin and around the shoulders. Do not rely on facial slimming or excessive hair coverage to create elegance.`;

export const SKIN_STANDARD_V2 = `Preserve authentic skin texture, visible fine pores, natural tonal variation, subtle age lines and realistic facial asymmetry.

Remove only temporary distractions such as minor blemishes, excessive shine or localized redness.

Do not erase age, texture or lived-in credibility.

Avoid plastic skin, heavy smoothing, artificial whitening or beauty-filter rendering.`;

export const RENDERING_STANDARD_V2 = `The final image must look like a real commissioned commercial portrait.

Use natural optical rendering, realistic depth of field, controlled dynamic range, gentle highlight rolloff and believable material textures.

Avoid artificial HDR, excessive sharpness, synthetic skin, fake hair, malformed wardrobe structure or obviously generated backgrounds.`;

export const PORTRAIT_GLOBAL_NEGATIVE_V2 = `Do not change the subject's identity.
Do not create a different face.
Do not beautify the subject into an idealized or standardized beauty template.
Do not significantly change apparent age.
Do not enlarge the eyes.
Do not reshape the nose, lips, eyebrows, jawline or face shape.
Do not significantly slim the face or body.
Do not alter natural skin tone, ethnicity or distinctive facial characteristics.
Do not preserve the original selfie angle, head tilt, body lean, raised shoulders or distorted camera perspective.
Do not create a timid, hesitant, vacant, fragile, uncertain or overly soft gaze.
Do not create an aggressive, intimidating, cold or excessively intense gaze.
Do not create a blank expression, exaggerated smile, fake teeth or overly pursed lips.
Do not create flat, oily or lifeless hair.
Do not change the hairline.
Do not create exaggerated hair volume, artificial salon curls, helmet-shaped hair, glossy wig texture or melted hair edges.
Do not create plastic skin.
Do not erase all pores, expression lines or natural asymmetry.
Do not apply excessive beauty retouching.
Do not create unrealistic facial symmetry.
Do not create malformed ears, shoulders, neck, clothing, jewelry or hair.
Do not duplicate accessories.
Do not create incorrect lapels, collars, buttons or fabric structure.
Do not use visible logos, text, signatures, watermarks or borders in the master portrait.
Do not use wide-angle facial distortion.
Do not use extreme shallow depth of field.
Do not create artificial HDR, glamour photography, cinematic drama or fashion-editorial posing.
Do not create a stock-photo smile.
Do not create a synthetic or obviously generated office background.
Do not overexpose the skin.
Do not make the face unnaturally white.
Do not make the portrait look like an upgraded passport photo.
The result must look like a real commercial portrait photographed by an experienced professional photographer.`;

const OUTPUT_STANDARD_V2 =
  "Create one vertical 4:5, high-resolution commercial portrait master at 1024 × 1536 with no text, logo, watermark, border or collage.";

const sharedV2Modules = {
  identity: IDENTITY_PRESERVATION_V2,
  source_interpretation: SOURCE_IMAGE_IDENTITY_ONLY_V2,
  pose_normalization: PROFESSIONAL_POSE_NORMALIZATION_V2,
  gaze: PROFESSIONAL_GAZE_V2,
  expression: PROFESSIONAL_EXPRESSION_V2,
  presence: PROFESSIONAL_PRESENCE_V2,
  hair_grooming: PROFESSIONAL_HAIR_GROOMING_V2,
  composition: COMPOSITION_STANDARD_V2,
  camera:
    "Place the camera at eye level. Use authentic commissioned commercial portrait photography with natural camera geometry and accurate anatomy.",
  skin: SKIN_STANDARD_V2,
  retouch:
    "Apply restrained commercial retouching only. Remove temporary distractions while preserving age, pores, natural asymmetry and lived-in credibility.",
  rendering: RENDERING_STANDARD_V2,
  output: OUTPUT_STANDARD_V2,
  negative: PORTRAIT_GLOBAL_NEGATIVE_V2,
} satisfies Partial<Record<PromptModuleCategory, string>>;

const sharedV2Parameters = {
  pose_normalization: {
    cameraHeight: "eye_level",
    chin: "slightly_forward_and_down",
    shoulders: "relaxed_balanced_open",
  },
  hair_grooming: {
    preserveHairline: true,
    preserveHairLength: true,
    preserveHairColor: true,
    crownFullness: 65,
    sideFullness: 60,
    strandSeparation: 70,
    flyawayAmount: 12,
  },
} satisfies Partial<Record<PromptModuleCategory, Record<string, unknown>>>;

export const PORTRAIT_STYLES_V2: PortraitStyle[] = [
  {
    id: "style_quiet_executive",
    slug: "quiet-executive",
    publicName: "Quiet Executive",
    publicNameZh: "静默领导者",
    internalReferenceName: "quiet_executive_v2",
    description:
      "克制、清晰、有判断力的现代科技领导者形象，适合创始人、管理层、产品负责人、投资人和媒体资料。",
    version: "2.0",
    engineVersion: "2.0",
    status: "active",
    accent: "#9BC4D8",
    traits: ["安静权威", "清晰判断", "克制存在感"],
    modules: {
      ...sharedV2Modules,
      career_identity:
        "Create a premium Quiet Executive portrait for a founder, senior operator, product leader or investor. Communicate clarity, emotional stability, judgment and quiet authority. The subject should feel grounded, credible and worthy of attention without theatrical dominance.",
      wardrobe:
        "Use minimalist premium wardrobe in black, navy or charcoal. Use matte fabrics, clean lines, refined tailoring and no visible branding. Keep accessories minimal and unobtrusive.",
      lens:
        "Use a natural 105mm executive portrait perspective with gentle optical compression and realistic facial proportions.",
      lighting:
        "Use a large, highly diffused softbox with subtle directional modeling, restrained fill and an extremely subtle rim light. Preserve natural eye catchlights.",
      background:
        "Use a clean cool gray to blue-gray gradient background with elegant negative space and no visible objects.",
      color:
        "Use neutral, slightly desaturated color science, controlled contrast, gentle highlight rolloff and natural skin tones.",
    },
    parameters: {
      ...sharedV2Parameters,
      pose_normalization: {
        ...sharedV2Parameters.pose_normalization,
        torsoRotation: 15,
        headRotation: 1,
        headTilt: 0,
      },
      gaze: {
        confidence: 90,
        stability: 94,
        focus: 94,
        warmth: 48,
        curiosity: 35,
        intensity: 35,
        aggression: 0,
      },
      expression: { smileIntensity: 1, jawRelaxation: 75 },
      presence: {
        groundedness: 94,
        composure: 95,
        authority: 76,
        clarity: 95,
        credibility: 92,
        visualWeight: 88,
      },
      hair_grooming: {
        ...sharedV2Parameters.hair_grooming,
        volumeIncreasePercent: 15,
        rootLift: 70,
        groomingFormality: 82,
      },
      lens: { focalLength: "105mm" },
      lighting: { setup: "large_diffused_softbox" },
      background: { treatment: "cool_gray_blue_gradient" },
    },
  },
  {
    id: "style_global_professional",
    slug: "global-professional",
    publicName: "Global Professional",
    publicNameZh: "国际职业形象",
    internalReferenceName: "global_professional_v2",
    description:
      "开放、可信、全球化的职业形象，适合国际公司主页、顾问、产品负责人和跨境业务角色。",
    version: "2.0",
    engineVersion: "2.0",
    status: "active",
    accent: "#8FB5AE",
    traits: ["可信开放", "稳定眼神", "国际职业感"],
    modules: {
      ...sharedV2Modules,
      pose_normalization:
        `${PROFESSIONAL_POSE_NORMALIZATION_V2}\n\nFor this DNA, position the torso approximately 15 to 18 degrees away from the camera and keep the posture open.`,
      gaze:
        `${PROFESSIONAL_GAZE_V2}\n\nThe gaze should communicate competence, attentiveness, reliability and genuine interest in other people.`,
      expression:
        `${PROFESSIONAL_EXPRESSION_V2}\n\nUse a natural, restrained professional smile with subtle warmth around the eyes.`,
      presence:
        `${PROFESSIONAL_PRESENCE_V2}\n\nBuild an open but substantial presence: globally minded, emotionally stable and easy to work with; confident without hierarchy and warm without softness.`,
      career_identity:
        "Create a premium Global Professional portrait that communicates competence, trust, openness, collaboration and international professionalism.",
      wardrobe:
        "Use clean modern tailoring in cream, light beige, soft gray or restrained neutrals. Use refined fabrics, a clean neckline and minimal accessories. Avoid visible logos, uniforms and generic stock-photo styling.",
      lens:
        "Use a realistic 85mm commercial portrait perspective with natural facial proportions and elegant background separation.",
      lighting:
        "Use soft directional daylight as if near a large window in a contemporary international office, with gentle facial dimensionality.",
      background:
        "Use a bright modern office background with softly blurred glass, pale architecture and restrained natural light. No obvious furniture, logos, staged laptops or clutter.",
      color:
        "Use a low-saturation blue-gray and warm-neutral palette with natural skin tones.",
    },
    parameters: {
      ...sharedV2Parameters,
      pose_normalization: {
        ...sharedV2Parameters.pose_normalization,
        torsoRotation: 17,
        headRotation: 2,
        headTilt: 0,
      },
      gaze: {
        confidence: 82,
        stability: 86,
        focus: 84,
        warmth: 72,
        curiosity: 45,
        intensity: 25,
        aggression: 0,
      },
      expression: { smileIntensity: 2.5, jawRelaxation: 80 },
      presence: {
        groundedness: 84,
        credibility: 92,
        openness: 88,
        authority: 60,
        approachability: 88,
      },
      hair_grooming: {
        ...sharedV2Parameters.hair_grooming,
        volumeIncreasePercent: 15,
        rootLift: 65,
        groomingFormality: 72,
      },
      lens: { focalLength: "85mm" },
      lighting: { setup: "directional_window_light" },
      background: { treatment: "bright_modern_office" },
    },
  },
  {
    id: "style_boardroom_leadership",
    slug: "boardroom-leadership",
    publicName: "Boardroom Leadership",
    publicNameZh: "高管领导力",
    internalReferenceName: "boardroom_leadership_v2",
    description:
      "稳重、负责、有视觉重量的高管形象，适合领导团队页、年报与董事会级媒体资料。",
    version: "2.0",
    engineVersion: "2.0",
    status: "active",
    accent: "#C2A584",
    traits: ["沉稳权威", "责任感", "高管重量"],
    modules: {
      ...sharedV2Modules,
      pose_normalization:
        `${PROFESSIONAL_POSE_NORMALIZATION_V2}\n\nFor this DNA, use a composed upper-torso portrait with torso rotation of approximately 12 to 15 degrees.`,
      gaze:
        `${PROFESSIONAL_GAZE_V2}\n\nThe gaze should communicate judgment, responsibility, decisiveness and calm authority without coldness or intimidation.`,
      expression:
        `${PROFESSIONAL_EXPRESSION_V2}\n\nUse a controlled, warm but highly restrained expression with only a minimal genuine smile.`,
      presence:
        `${PROFESSIONAL_PRESENCE_V2}\n\nBuild strong executive presence: substantial, dependable and accustomed to responsibility; authority without arrogance, experience without stiffness.`,
      career_identity:
        "Create a premium Boardroom Leadership portrait that communicates leadership, integrity, judgment, responsibility and executive presence.",
      wardrobe:
        "Use premium tailoring in black, charcoal or deep navy, with matte fabrics, clean shoulder construction, precise lines and no visible branding.",
      lens:
        "Use a natural 105mm executive portrait perspective with realistic proportions and gentle optical compression.",
      lighting:
        "Apply classic three-point commercial lighting: a large soft key, controlled gentle fill and very subtle rim light, with soft modeling and controlled shadows.",
      background:
        "Use a deep neutral gray, charcoal or restrained dark gray-blue studio background without decorative texture, dramatic gradients or objects.",
      color:
        "Use controlled contrast, deep neutral tonal range and sophisticated restrained color science.",
    },
    parameters: {
      ...sharedV2Parameters,
      pose_normalization: {
        ...sharedV2Parameters.pose_normalization,
        torsoRotation: 13,
        headRotation: 1,
        headTilt: 0,
      },
      gaze: {
        confidence: 94,
        stability: 96,
        focus: 95,
        warmth: 42,
        intensity: 48,
        curiosity: 20,
        authority: 88,
        aggression: 0,
      },
      expression: { smileIntensity: 1, jawRelaxation: 72 },
      presence: {
        groundedness: 98,
        authority: 93,
        responsibility: 95,
        credibility: 96,
        visualWeight: 95,
      },
      hair_grooming: {
        ...sharedV2Parameters.hair_grooming,
        volumeIncreasePercent: 12,
        rootLift: 62,
        groomingFormality: 90,
      },
      lens: { focalLength: "105mm" },
      lighting: { setup: "executive_three_point" },
      background: { treatment: "charcoal_deep_gray" },
    },
  },
  {
    id: "style_founder_studio",
    slug: "founder-studio",
    publicName: "Founder Studio",
    publicNameZh: "创业者工作室",
    internalReferenceName: "founder_studio_v2",
    description:
      "有行动力、好奇心和创作能量的现代创业者形象，适合公司主页与独立创意实践。",
    version: "2.0",
    engineVersion: "2.0",
    status: "active",
    accent: "#C6B8D8",
    traits: ["创始人能动性", "聪明好奇", "自然松弛"],
    modules: {
      ...sharedV2Modules,
      pose_normalization:
        `${PROFESSIONAL_POSE_NORMALIZATION_V2}\n\nFor this DNA, use a relaxed upper-torso composition and turn the torso approximately 15 to 20 degrees.`,
      gaze:
        `${PROFESSIONAL_GAZE_V2}\n\nThe gaze should communicate curiosity, intelligence, agency and confidence without cuteness or exaggerated enthusiasm.`,
      expression:
        `${PROFESSIONAL_EXPRESSION_V2}\n\nCreate an authentic understated smile that feels thoughtful, optimistic and fully engaged.`,
      presence:
        `${PROFESSIONAL_PRESENCE_V2}\n\nBuild founder presence: someone who initiates ideas, makes decisions and turns concepts into reality. Communicate creative energy and agency without startup clichés.`,
      hair_grooming:
        `${PROFESSIONAL_HAIR_GROOMING_V2}\n\nAllow slightly more natural movement and texture than executive styles while keeping the hair refined and intentional.`,
      career_identity:
        "Create a premium Founder Studio portrait that communicates builder mindset, curiosity, creativity, independence, judgment, agency and approachability.",
      wardrobe:
        "Use modern, intelligent and relaxed wardrobe: refined cream knit, minimalist shirt, understated jacket or clean simple dress. Avoid hoodies, logos, forced casual styling and fashion-editorial clothing.",
      lens:
        "Use a realistic 85mm environmental portrait perspective with natural optical rendering and elegant depth of field.",
      lighting:
        "Use soft afternoon window light with subtle directional modeling and gentle warmth. It should feel natural and discovered but professionally controlled.",
      background:
        "Use a minimal creative workspace with softly blurred pale walls, glass, natural materials and a very small amount of greenery. No laptops, neon signs, slogans, messy desks or props.",
      color:
        "Use a clean modern neutral palette with gentle warmth and low saturation.",
    },
    parameters: {
      ...sharedV2Parameters,
      pose_normalization: {
        ...sharedV2Parameters.pose_normalization,
        torsoRotation: 18,
        headRotation: 2,
        headTilt: 0,
      },
      gaze: {
        confidence: 82,
        stability: 84,
        focus: 84,
        warmth: 68,
        curiosity: 82,
        intensity: 28,
        aggression: 0,
      },
      expression: { smileIntensity: 2.5, jawRelaxation: 84 },
      presence: {
        groundedness: 82,
        creativity: 88,
        agency: 90,
        approachability: 78,
        credibility: 84,
        authority: 54,
      },
      hair_grooming: {
        ...sharedV2Parameters.hair_grooming,
        volumeIncreasePercent: 18,
        rootLift: 72,
        groomingFormality: 58,
      },
      lens: { focalLength: "85mm" },
      lighting: { setup: "soft_afternoon_window" },
      background: { treatment: "minimal_creative_workspace" },
    },
  },
];

export const PORTRAIT_STYLE_VERSIONS: PortraitStyle[] = [
  ...PORTRAIT_STYLES_V1,
  ...PORTRAIT_STYLES_V2,
];

// New orders see only the active v2 catalog. Historical readers use
// PORTRAIT_STYLE_VERSIONS or getStyleVersion.
export const PORTRAIT_STYLES = PORTRAIT_STYLES_V2;

export function getStyleVersion(styleId: string, version: string) {
  const style = PORTRAIT_STYLE_VERSIONS.find(
    (item) => item.id === styleId && item.version === version,
  );
  if (!style) {
    throw new Error("所选 Portrait DNA 版本不存在。");
  }
  return style;
}

export function getStyle(styleId: string, version?: string) {
  const style = version
    ? getStyleVersion(styleId, version)
    : PORTRAIT_STYLES.find((item) => item.id === styleId);
  if (!style || style.status !== "active") {
    throw new Error("所选 Portrait DNA 版本不存在、尚未发布或已停用。");
  }
  return style;
}
