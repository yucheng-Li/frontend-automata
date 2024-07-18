import React from "react";
import "./TopMenu.css";
import MediumResourceDisplay from "./MediumResourceDisplay";
import CrystalIcon from "../images/Icons/Crystal.png";
import InterstellarMineralIcon from "../images/Icons/InterstellarMineral.png";
import BiomassIcon from "../images/Icons/Biomass.png";
import QuantumFoamIcon from "../images/Icons/QuantumFoam.png";
import NecrodermisIcon from "../images/Icons/Necrodermis.png";
import AlienFloralIcon from "../images/Icons/AlienFloral.png";
import SpiceMelangeIcon from "../images/Icons/SpiceMelange.png";
import TitaniumIcon from "../images/Icons/Titanium.png";

import EnercoreIcon from "../images/Icons/Enercore.png";
import NexiumIcon from "../images/Icons/Nexium.png";
import SwiftexIcon from "../images/Icons/Swiftex.png";
import CognisurgeIcon from "../images/Icons/Cognisurge.png";
import VitalshieldIcon from "../images/Icons/Vitalshield.png";
import FlexonixIcon from "../images/Icons/Flexonix.png";
import SmallResourceDisplay from "./SmallResourceDisplay";
import AccountInfo from "./AccountInfo";

interface Props {
  crystalAmount: number;
  interstellarMineralAmount: number;
  biomassAmount: number;
  quantumFoamAmount: number;
  necrodermisAmount: number;
  alienFloralAmount: number;
  spiceMelangeAmount: number;
  titaniumAmount: number;
  enercoreAmount: number;
  nexiumAmount: number;
  swiftexAmount: number;
  cognisurgeAmount: number;
  vitalshieldAmount: number;
  flexonixAmount: number;
  address: string;
}

const TopMenu = ({
  crystalAmount,
  interstellarMineralAmount,
  biomassAmount,
  quantumFoamAmount,
  necrodermisAmount,
  alienFloralAmount,
  spiceMelangeAmount,
  titaniumAmount,
  enercoreAmount,
  nexiumAmount,
  swiftexAmount,
  cognisurgeAmount,
  vitalshieldAmount,
  flexonixAmount,
  address,
}: Props) => {
  return (
    <div className="top">
      <div className="top-left"></div>
      <div className="top-middle"></div>
      <div className="top-right"></div>
      <AccountInfo address={address} />
      <MediumResourceDisplay
        order={0}
        iconImagePath={CrystalIcon}
        amount={crystalAmount}
      />
      <MediumResourceDisplay
        order={1}
        iconImagePath={InterstellarMineralIcon}
        amount={interstellarMineralAmount}
      />
      <MediumResourceDisplay
        order={2}
        iconImagePath={BiomassIcon}
        amount={biomassAmount}
      />
      <MediumResourceDisplay
        order={3}
        iconImagePath={QuantumFoamIcon}
        amount={quantumFoamAmount}
      />
      <MediumResourceDisplay
        order={4}
        iconImagePath={NecrodermisIcon}
        amount={necrodermisAmount}
      />
      <MediumResourceDisplay
        order={5}
        iconImagePath={AlienFloralIcon}
        amount={alienFloralAmount}
      />
      <MediumResourceDisplay
        order={6}
        iconImagePath={SpiceMelangeIcon}
        amount={spiceMelangeAmount}
      />
      <MediumResourceDisplay
        order={7}
        iconImagePath={TitaniumIcon}
        amount={titaniumAmount}
      />
      <SmallResourceDisplay
        order={0}
        iconImagePath={EnercoreIcon}
        amount={enercoreAmount}
      />
      <SmallResourceDisplay
        order={1}
        iconImagePath={NexiumIcon}
        amount={nexiumAmount}
      />
      <SmallResourceDisplay
        order={2}
        iconImagePath={SwiftexIcon}
        amount={swiftexAmount}
      />
      <SmallResourceDisplay
        order={3}
        iconImagePath={CognisurgeIcon}
        amount={cognisurgeAmount}
      />
      <SmallResourceDisplay
        order={4}
        iconImagePath={VitalshieldIcon}
        amount={vitalshieldAmount}
      />
      <SmallResourceDisplay
        order={5}
        iconImagePath={FlexonixIcon}
        amount={flexonixAmount}
      />
    </div>
  );
};

export default TopMenu;