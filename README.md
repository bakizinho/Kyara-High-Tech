<svg width="1200" height="520" viewBox="0 0 1200 520"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-labelledby="title desc">

  <title id="title">KYARA HIGH-TECH v1 — System Online</title>
  <desc id="desc">Animated system status panel for the Kyara WhatsApp ecosystem.</desc>

  <defs>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity=".08"/>
    </pattern>

    <linearGradient id="line" x1="0" x2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity=".9"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>

    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#9b9b9b"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>

    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <style>
      .mono {
        font-family: "Courier New", Courier, monospace;
      }

      .title {
        font-family: "Courier New", Courier, monospace;
        font-weight: 700;
        letter-spacing: 8px;
      }

      .blink {
        animation: blink 1.8s ease-in-out infinite;
      }

      .blink-delay {
        animation: blink 1.8s ease-in-out .6s infinite;
      }

      .pulse {
        animation: pulse 2.4s ease-in-out infinite;
      }

      .scan {
        animation: scan 4s linear infinite;
      }

      .load {
        animation: load 2.8s ease-in-out infinite;
        transform-origin: left center;
      }

      @keyframes blink {
        0%, 100% { opacity: .35; }
        50% { opacity: 1; }
      }

      @keyframes pulse {
        0%, 100% { opacity: .45; }
        50% { opacity: 1; }
      }

      @keyframes scan {
        0% { transform: translateY(-160px); opacity: 0; }
        15% { opacity: .8; }
        75% { opacity: .8; }
        100% { transform: translateY(500px); opacity: 0; }
      }

      @keyframes load {
        0% { transform: scaleX(.35); opacity: .4; }
        50% { transform: scaleX(1); opacity: 1; }
        100% { transform: scaleX(.35); opacity: .4; }
      }
    </style>
  </defs>

  <rect width="1200" height="520" rx="22" fill="#070707"/>
  <rect x="1" y="1" width="1198" height="518" rx="21"
    fill="url(#grid)" stroke="#424242" stroke-width="2"/>

  <!-- Technical frame -->
  <path d="M34 92V34H92M1108 34H1166V92M34 428V486H92M1108 486H1166V428"
    fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="2"/>

  <path d="M34 118H1166M34 402H1166"
    stroke="#ffffff" stroke-opacity=".12"/>

  <!-- Header -->
  <text x="64" y="72" class="mono" font-size="13" fill="#8c8c8c">
    KYARA / ENGINE MONITOR / BUILD 001
  </text>

  <text x="1136" y="72" class="mono" text-anchor="end"
    font-size="13" fill="#8c8c8c">
    NODE-LTS // SECURE
  </text>

  <text x="600" y="166" text-anchor="middle"
    class="title" font-size="58" fill="url(#metal)">
    KYARA
  </text>

  <text x="600" y="201" text-anchor="middle"
    class="mono" font-size="16" letter-spacing="6" fill="#999999">
    HIGH-TECH v1 / MODULAR WHATSAPP ECOSYSTEM
  </text>

  <!-- Status line -->
  <circle cx="78" cy="246" r="5" fill="#ffffff" filter="url(#glow)" class="pulse"/>
  <text x="96" y="251" class="mono" font-size="15" fill="#cfcfcf">
    BOOT SEQUENCE COMPLETE
  </text>

  <text x="1122" y="251" text-anchor="end"
    class="mono" font-size="15" fill="#ffffff">
    SYSTEM ONLINE
  </text>

  <line x1="78" y1="270" x2="1122" y2="270"
    stroke="url(#line)" stroke-width="2"/>

  <!-- Core modules -->
  <g class="mono" font-size="15">
    <g>
      <circle cx="100" cy="315" r="5" fill="#ffffff" class="blink"/>
      <text x="120" y="311" fill="#777777">AI CORE</text>
      <text x="120" y="333" fill="#ffffff">ONLINE</text>
      <rect x="120" y="346" width="180" height="3" fill="#292929"/>
      <rect x="120" y="346" width="180" height="3" fill="#ffffff" class="load"/>
    </g>

    <g>
      <circle cx="370" cy="315" r="5" fill="#ffffff" class="blink-delay"/>
      <text x="390" y="311" fill="#777777">MEDIA CORE</text>
      <text x="390" y="333" fill="#ffffff">ONLINE</text>
      <rect x="390" y="346" width="180" height="3" fill="#292929"/>
      <rect x="390" y="346" width="180" height="3" fill="#ffffff" class="load"
        style="animation-delay:.35s"/>
    </g>

    <g>
      <circle cx="640" cy="315" r="5" fill="#ffffff" class="blink"/>
      <text x="660" y="311" fill="#777777">RPG CORE</text>
      <text x="660" y="333" fill="#ffffff">ONLINE</text>
      <rect x="660" y="346" width="180" height="3" fill="#292929"/>
      <rect x="660" y="346" width="180" height="3" fill="#ffffff" class="load"
        style="animation-delay:.7s"/>
    </g>

    <g>
      <circle cx="910" cy="315" r="5" fill="#ffffff" class="blink-delay"/>
      <text x="930" y="311" fill="#777777">GROUP CORE</text>
      <text x="930" y="333" fill="#ffffff">ONLINE</text>
      <rect x="930" y="346" width="180" height="3" fill="#292929"/>
      <rect x="930" y="346" width="180" height="3" fill="#ffffff" class="load"
        style="animation-delay:1.05s"/>
    </g>
  </g>

  <!-- Database -->
  <g class="mono">
    <circle cx="100" cy="382" r="4" fill="#ffffff" class="pulse"/>
    <text x="120" y="387" font-size="14" fill="#777777">DATABASE</text>
    <text x="270" y="387" font-size="14" fill="#ffffff">READY</text>

    <circle cx="1010" cy="382" r="4" fill="#ffffff" class="pulse"/>
    <text x="1030" y="387" font-size="14" fill="#ffffff">SECURITY ACTIVE</text>
  </g>

  <!-- Moving scanline -->
  <rect x="40" y="120" width="1120" height="2"
    fill="#ffffff" opacity=".25" class="scan"/>

  <!-- Footer -->
  <line x1="78" y1="423" x2="1122" y2="423"
    stroke="url(#line)" stroke-width="2"/>

  <text x="600" y="459" text-anchor="middle"
    class="mono" font-size="18" letter-spacing="5" fill="#dddddd">
    KYARA HIGH-TECH
  </text>

  <text x="600" y="484" text-anchor="middle"
    class="mono" font-size="12" letter-spacing="3" fill="#666666">
    SYSTEM ARCHITECTURE / MODULAR ENGINE / v1
  </text>
</svg>