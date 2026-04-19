import lgLan091 from "../../assets/95_ServiceManual_LG_LAN091CNP.pdf";
import mideaMsy from "../../assets/95_ServiceManual_Midea_MSY_HRDN1_Series.pdf";
import panasonicCs from "../../assets/95_ServiceManual_Panasonic_Series_CS-E_JKEW.pdf";
import yorkPyrenees from "../../assets/95_ServiceManual_YORK_Pyrenees_Series.pdf";
import daikinFtxN from "../../assets/98_ServiceManual_Daikin_FTX-N_Series.pdf";
import daikinFtxnK from "../../assets/98_ServiceManual_Daikin_FTXN-K_Series.pdf";
import daikinFtxrT from "../../assets/98_ServiceManual_Daikin_FTXR-T_Series.pdf";
import mabeTundra from "../../assets/98_ServiceManual_Mabe_Tundra_Inverter_Series.pdf";

export type ManualItem = {
  id: string;
  title: string;
  brand: string;
  fileName: string;
  url: string;
};

export const SAMPLE_MANUALS: ManualItem[] = [
  {
    id: "lg-lan091",
    title: "LAN091 CNP",
    brand: "LG",
    fileName: "95_ServiceManual_LG_LAN091CNP.pdf",
    url: lgLan091,
  },
  {
    id: "midea-msy",
    title: "MSY-HRDN1 Series",
    brand: "Midea",
    fileName: "95_ServiceManual_Midea_MSY_HRDN1_Series.pdf",
    url: mideaMsy,
  },
  {
    id: "panasonic-cs",
    title: "CS-E / JKEW Series",
    brand: "Panasonic",
    fileName: "95_ServiceManual_Panasonic_Series_CS-E_JKEW.pdf",
    url: panasonicCs,
  },
  {
    id: "york-pyrenees",
    title: "Pyrenees Series",
    brand: "YORK",
    fileName: "95_ServiceManual_YORK_Pyrenees_Series.pdf",
    url: yorkPyrenees,
  },
  {
    id: "daikin-ftx-n",
    title: "FTX-N Series",
    brand: "Daikin",
    fileName: "98_ServiceManual_Daikin_FTX-N_Series.pdf",
    url: daikinFtxN,
  },
  {
    id: "daikin-ftxn-k",
    title: "FTXN-K Series",
    brand: "Daikin",
    fileName: "98_ServiceManual_Daikin_FTXN-K_Series.pdf",
    url: daikinFtxnK,
  },
  {
    id: "daikin-ftxr-t",
    title: "FTXR-T Series",
    brand: "Daikin",
    fileName: "98_ServiceManual_Daikin_FTXR-T_Series.pdf",
    url: daikinFtxrT,
  },
  {
    id: "mabe-tundra",
    title: "Tundra Inverter Series",
    brand: "Mabe",
    fileName: "98_ServiceManual_Mabe_Tundra_Inverter_Series.pdf",
    url: mabeTundra,
  },
];
