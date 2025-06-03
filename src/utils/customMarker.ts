import L from "leaflet";

export default (
  fillColor: string | string[] = "#00BD7EFF",
  fillOpacity: number = 1,
  borderColor: string = "#31363f",
) => {
  return L.divIcon({
    html: `
    <svg
   viewBox="64 64 25 35"
   focusable="false"
   id="svg1"
   width="25"
   height="35"
   >
  <defs
     id="defs1" />
  <g
     id="layer1"
     transform="translate(-76,-3)">
    <path
       id="path2"
       style="fill:#1bb982;fill-opacity:${fillOpacity};stroke:#31363f;stroke-width:0.0446892;stroke-dasharray:none"
       d="m 150.53457,68.283286 -5.22141,2.487579 -4.54496,6.798904 2.89341,11.658883 8.6327,11.772628 6.33348,-7.659915 4.54711,-8.596702 0.30659,-7.916794 -2.50491,-5.254862 -4.60332,-2.991978 z m 2.30917,5.912152 c 3.20594,-3.8e-5 5.40694,2.330367 5.40698,5.478066 2e-5,3.147736 -2.20101,5.920768 -5.40698,5.920729 -3.20593,-1.2e-5 -5.80482,-2.551742 -5.8048,-5.699443 3e-5,-3.147662 2.5989,-5.699338 5.8048,-5.699352 z"
       >
       ${
      Array.isArray(fillColor)
        ? `
       <animate
        attributeName="fill"
        values="${fillColor.join(";")};${fillColor.reverse().join(";")}"
        dur="1s"
        repeatCount="indefinite">
        </animate>`
        : ""
    }

</path>
    <ellipse
       style="fill:none;stroke:#31363f;stroke-width:1.97623;stroke-dasharray:none;paint-order:stroke fill markers"
       id="path3"
       cx="152.49945"
       cy="79.727173"
       rx="4.9454117"
       ry="5.0441008" />
    <path
       d="m 152.49906,68.090502 c -6.30045,6.51e-4 -11.40784,5.209848 -11.40864,11.636019 -2.1e-4,6.42689 5.94684,15.178558 11.40864,20.720209 5.4135,-5.492661 11.41066,-14.292596 11.41045,-20.720209 -8e-4,-6.426896 -5.10929,-11.636391 -11.41045,-11.636019 z"
       style="fill:none;stroke:${borderColor};stroke-width:2.18101;stroke-dasharray:none;stroke-opacity:1;paint-order:stroke fill markers"
       id="path4"
       />
  </g>
</svg>

`,
    className: "STEPIcon",
    iconSize: [25, 35],
    iconAnchor: [12.5, 35],
    tooltipAnchor: [12.5, -17.5],
    popupAnchor: [0, -35],
  });
};
