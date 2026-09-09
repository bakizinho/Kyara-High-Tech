<svg width="1200" height="520" viewBox="0 0 1200 520"
xmlns="http://www.w3.org/2000/svg">

<defs>

  <!-- GRID -->
  <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
    <path d="M48 0H0V48"
      fill="none"
      stroke="#ffffff"
      stroke-opacity=".07"/>
  </pattern>

  <!-- LINHAS -->
  <linearGradient id="line" x1="0" x2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset=".5" stop-color="#ffffff" stop-opacity=".9"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>

  <!-- METAL -->
  <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffffff"/>
    <stop offset=".45" stop-color="#888888"/>
    <stop offset=".7" stop-color="#ffffff"/>
    <stop offset="1" stop-color="#777777"/>
  </linearGradient>

  <!-- BRILHO -->
  <filter id="glow"
    x="-100%" y="-100%"
    width="300%" height="300%">

    <feGaussianBlur
      stdDeviation="4"
      result="blur"/>

    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>

  </filter>

  <!-- BRILHO FORTE -->
  <filter id="strongGlow"
    x="-100%" y="-100%"
    width="300%" height="300%">

    <feGaussianBlur
      stdDeviation="8"
      result="blur"/>

    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>

  </filter>

  <style>

    .mono {
      font-family:
        "Courier New",
        Courier,
        monospace;
    }

    .title {
      font-family:
        "Courier New",
        Courier,
        monospace;

      font-weight: 700;
      letter-spacing: 10px;
    }

    .small {
      font-family:
        "Courier New",
        Courier,
        monospace;

      letter-spacing: 3px;
    }

    /* STATUS */
    .pulse {
      animation:
        pulse 2.2s ease-in-out infinite;
    }

    .blink {
      animation:
        blink 1.8s ease-in-out infinite;
    }

    .blink2 {
      animation:
        blink 1.8s ease-in-out .6s infinite;
    }

    /* BARRAS */
    .load {
      transform-origin: left center;
      animation:
        load 3s ease-in-out infinite;
    }

    .load2 {
      transform-origin: left center;
      animation:
        load 3s ease-in-out .4s infinite;
    }

    .load3 {
      transform-origin: left center;
      animation:
        load 3s ease-in-out .8s infinite;
    }

    .load4 {
      transform-origin: left center;
      animation:
        load 3s ease-in-out 1.2s infinite;
    }

    /* SCAN */
    .scan {
      animation:
        scan 4s linear infinite;
    }

    /* LOGO */
    .logoGlow {
      animation:
        logoPulse 3s ease-in-out infinite;
    }

    /* TEXT GLITCH */
    .glitch {
      animation:
        glitch 5s steps(1) infinite;
    }

    @keyframes pulse {

      0%,100% {
        opacity:.35;
      }

      50% {
        opacity:1;
      }

    }

    @keyframes blink {

      0%,100% {
        opacity:.25;
      }

      50% {
        opacity:1;
      }

    }

    @keyframes load {

      0% {
        transform:scaleX(.35);
        opacity:.35;
      }

      50% {
        transform:scaleX(1);
        opacity:1;
      }

      100% {
        transform:scaleX(.35);
        opacity:.35;
      }

    }

    @keyframes scan {

      0% {
        transform:translateY(-120px);
        opacity:0;
      }

      15% {
        opacity:.65;
      }

      75% {
        opacity:.65;
      }

      100% {
        transform:translateY(560px);
        opacity:0;
      }

    }

    @keyframes logoPulse {

      0%,100% {
        opacity:.75;
      }

      50% {
        opacity:1;
      }

    }

    @keyframes glitch {

      0%,90%,100% {
        transform:translateX(0);
      }

      92% {
        transform:translateX(-2px);
      }

      94% {
        transform:translateX(2px);
      }

      96% {
        transform:translateX(-1px);
      }

    }

  </style>

</defs>


<!-- ========================================================= -->
<!-- BACKGROUND -->
<!-- ========================================================= -->

<rect
  width="1200"
  height="520"
  rx="22"
  fill="#050505"/>

<rect
  x="1"
  y="1"
  width="1198"
  height="518"
  rx="21"
  fill="url(#grid)"
  stroke="#3c3c3c"
  stroke-width="2"/>


<!-- ========================================================= -->
<!-- OUTER HUD FRAME -->
<!-- ========================================================= -->

<path
  d="
  M34 92
  V34
  H92

  M1108 34
  H1166
  V92

  M34 428
  V486
  H92

  M1108 486
  H1166
  V428
  "
  fill="none"
  stroke="#ffffff"
  stroke-opacity=".55"
  stroke-width="2"/>


<!-- HUD CORNER DETAILS -->

<path
  d="M50 60H180"
  stroke="#ffffff"
  stroke-opacity=".15"/>

<path
  d="M1020 60H1150"
  stroke="#ffffff"
  stroke-opacity=".15"/>

<path
  d="M50 460H180"
  stroke="#ffffff"
  stroke-opacity=".15"/>

<path
  d="M1020 460H1150"
  stroke="#ffffff"
  stroke-opacity=".15"/>


<!-- ========================================================= -->
<!-- HEADER -->
<!-- ========================================================= -->

<text
  x="64"
  y="72"
  class="mono"
  font-size="13"
  fill="#858585">

  KYARA / ENGINE MONITOR / BUILD 001

</text>


<text
  x="1136"
  y="72"
  text-anchor="end"
  class="mono"
  font-size="13"
  fill="#858585">

  NODE-LTS // SECURE

</text>


<!-- ========================================================= -->
<!-- KYARA LOGO -->
<!-- ========================================================= -->

<g
  class="logoGlow"
  filter="url(#glow)">

  <!-- símbolo geométrico -->
  <path
    d="
      M570 112
      L590 88
      L600 103
      L610 88
      L630 112
      L615 112
      L600 125
      L585 112
      Z"
    fill="none"
    stroke="#ffffff"
    stroke-width="3"/>

  <circle
    cx="600"
    cy="108"
    r="3"
    fill="#ffffff"/>

</g>


<text
  x="600"
  y="165"
  text-anchor="middle"
  class="title glitch"
  font-size="58"
  fill="url(#metal)">

  KYARA

</text>


<text
  x="600"
  y="201"
  text-anchor="middle"
  class="mono"
  font-size="16"
  letter-spacing="6"
  fill="#999999">

  HIGH-TECH v1 / MODULAR WHATSAPP ECOSYSTEM

</text>


<!-- ========================================================= -->
<!-- SIDE INFORMATION -->
<!-- ========================================================= -->

<path
  d="M64 137V201"
  stroke="#ffffff"
  stroke-width="2"/>

<text
  x="82"
  y="154"
  class="mono"
  font-size="11"
  fill="#8c8c8c">

  MAIS QUE UM BOT,

</text>

<text
  x="82"
  y="172"
  class="mono"
  font-size="11"
  fill="#8c8c8c">

  UM ECOSSISTEMA.

</text>

<text
  x="82"
  y="190"
  class="mono"
  font-size="11"
  fill="#ffffff">

  KYARA.

</text>


<!-- RIGHT SYSTEM LIST -->

<path
  d="M1070 137V201"
  stroke="#ffffff"
  stroke-width="2"/>

<text
  x="1090"
  y="153"
  class="mono"
  font-size="11"
  fill="#ffffff">

  AI // RPG // MEDIA

</text>

<text
  x="1090"
  y="171"
  class="mono"
  font-size="11"
  fill="#999999">

  ECONOMY // GROUP

</text>

<text
  x="1090"
  y="189"
  class="mono"
  font-size="11"
  fill="#999999">

  DOWNLOADS // SOCIAL

</text>


<!-- ========================================================= -->
<!-- SYSTEM STATUS -->
<!-- ========================================================= -->

<circle
  cx="78"
  cy="246"
  r="5"
  fill="#ffffff"
  filter="url(#strongGlow)"
  class="pulse"/>


<text
  x="96"
  y="251"
  class="mono"
  font-size="15"
  fill="#d0d0d0">

  BOOT SEQUENCE COMPLETE

</text>


<text
  x="1122"
  y="251"
  text-anchor="end"
  class="mono"
  font-size="15"
  fill="#ffffff">

  SYSTEM ONLINE

</text>


<line
  x1="78"
  y1="270"
  x2="1122"
  y2="270"
  stroke="url(#line)"
  stroke-width="2"/>


<!-- ========================================================= -->
<!-- CORE CARD FUNCTION -->
<!-- ========================================================= -->


<!-- AI -->

<g>

  <circle
    cx="100"
    cy="315"
    r="5"
    fill="#ffffff"
    filter="url(#glow)"
    class="blink"/>

  <text
    x="120"
    y="311"
    class="mono"
    font-size="15"
    fill="#777777">

    AI CORE

  </text>

  <text
    x="120"
    y="333"
    class="mono"
    font-size="15"
    fill="#ffffff">

    ONLINE

  </text>

  <rect
    x="120"
    y="346"
    width="180"
    height="3"
    fill="#252525"/>

  <rect
    x="120"
    y="346"
    width="180"
    height="3"
    fill="#ffffff"
    class="load"/>

  <text
    x="304"
    y="349"
    class="mono"
    font-size="10"
    fill="#888888">

    100%

  </text>

</g>


<!-- MEDIA -->

<g>

  <circle
    cx="370"
    cy="315"
    r="5"
    fill="#ffffff"
    filter="url(#glow)"
    class="blink2"/>

  <text
    x="390"
    y="311"
    class="mono"
    font-size="15"
    fill="#777777">

    MEDIA CORE

  </text>

  <text
    x="390"
    y="333"
    class="mono"
    font-size="15"
    fill="#ffffff">

    ONLINE

  </text>

  <rect
    x="390"
    y="346"
    width="180"
    height="3"
    fill="#252525"/>

  <rect
    x="390"
    y="346"
    width="180"
    height="3"
    fill="#ffffff"
    class="load2"/>

  <text
    x="574"
    y="349"
    class="mono"
    font-size="10"
    fill="#888888">

    100%

  </text>

</g>


<!-- RPG -->

<g>

  <circle
    cx="640"
    cy="315"
    r="5"
    fill="#ffffff"
    filter="url(#glow)"
    class="blink"/>

  <text
    x="660"
    y="311"
    class="mono"
    font-size="15"
    fill="#777777">

    RPG CORE

  </text>

  <text
    x="660"
    y="333"
    class="mono"
    font-size="15"
    fill="#ffffff">

    ONLINE

  </text>

  <rect
    x="660"
    y="346"
    width="180"
    height="3"
    fill="#252525"/>

  <rect
    x="660"
    y="346"
    width="180"
    height="3"
    fill="#ffffff"
    class="load3"/>

  <text
    x="844"
    y="349"
    class="mono"
    font-size="10"
    fill="#888888">

    100%

  </text>

</g>


<!-- GROUP -->

<g>

  <circle
    cx="910"
    cy="315"
    r="5"
    fill="#ffffff"
    filter="url(#glow)"
    class="blink2"/>

  <text
    x="930"
    y="311"
    class="mono"
    font-size="15"
    fill="#777777">

    GROUP CORE

  </text>

  <text
    x="930"
    y="333"
    class="mono"
    font-size="15"
    fill="#ffffff">

    ONLINE

  </text>

  <rect
    x="930"
    y="346"
    width="180"
    height="3"
    fill="#252525"/>

  <rect
    x="930"
    y="346"
    width="180"
    height="3"
    fill="#ffffff"
    class="load4"/>

  <text
    x="1114"
    y="349"
    text-anchor="end"
    class="mono"
    font-size="10"
    fill="#888888">

    100%

  </text>

</g>


<!-- ========================================================= -->
<!-- DATABASE -->
<!-- ========================================================= -->

<circle
  cx="100"
  cy="382"
  r="4"
  fill="#ffffff"
  filter="url(#glow)"
  class="pulse"/>

<text
  x="120"
  y="387"
  class="mono"
  font-size="14"
  fill="#777777">

  DATABASE

</text>

<text
  x="270"
  y="387"
  class="mono"
  font-size="14"
  fill="#ffffff">

  READY

</text>


<!-- SECURITY -->

<circle
  cx="1010"
  cy="382"
  r="4"
  fill="#ffffff"
  filter="url(#glow)"
  class="pulse"/>

<text
  x="1030"
  y="387"
  class="mono"
  font-size="14"
  fill="#ffffff">

  SECURITY ACTIVE

</text>


<!-- ========================================================= -->
<!-- SCANLINE -->
<!-- ========================================================= -->

<rect
  x="40"
  y="120"
  width="1120"
  height="2"
  fill="#ffffff"
  opacity=".22"
  class="scan"/>


<!-- ========================================================= -->
<!-- FOOTER -->
<!-- ========================================================= -->

<line
  x1="78"
  y1="423"
  x2="1122"
  y2="423"
  stroke="url(#line)"
  stroke-width="2"/>


<text
  x="600"
  y="459"
  text-anchor="middle"
  class="mono"
  font-size="18"
  letter-spacing="5"
  fill="#dddddd">

  KYARA HIGH-TECH

</text>


<text
  x="600"
  y="484"
  text-anchor="middle"
  class="mono"
  font-size="12"
  letter-spacing="3"
  fill="#666666">

  SYSTEM ARCHITECTURE / MODULAR ENGINE / v1

</text>


<text
  x="64"
  y="477"
  class="mono"
  font-size="10"
  fill="#777777">

  DEVELOPED BY BAKI

</text>


<text
  x="1136"
  y="477"
  text-anchor="end"
  class="mono"
  font-size="10"
  fill="#777777">

  KYARA © 2026

</text>

</svg>