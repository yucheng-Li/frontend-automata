import React, { useState, useEffect, useRef, memo } from 'react';
import { useAppSelector } from "../../app/hooks";
import { DndContext, useDroppable, DragOverlay } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { query_state, send_transaction, query_config } from "./rpc";
import { Alert, Col, Row, OverlayTrigger, Tooltip } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./style.scss";
import { selectL2Account } from "../../data/accountSlice";

const CMD_INSTALL_PLAYER = 1n;
const CMD_INSTALL_OBJECT = 2n;
const CMD_RESTART_OBJECT = 3n;

interface Modifier {
   delay: number,
   entity: Array<number>,
   local: Array<number>,
   name: string,
}

interface ObjectProperty {
  entity: Array<number>,
  object_id: Array<string>,
  modifiers: Array<number>,
  current_modifier_index: number,
}

export function GameController() {
  const [playerIds, setPlayerIds] = useState("");
  const [objects, setObjects] = useState<Array<ObjectProperty>>([]);
  const [dropList, setDropList] = useState<{id: number, action: string}[]>([]);
  const [entityAttributes, setEntityAttributes] = useState<string[]>([]);
  const [localAttributes, setLocalAttributes] = useState<string[]>([]);
  const [localValues, setLocalValues] = useState<number[]>([]);
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [highlightedId, setHighlightedId] = useState("");
  const [currentModifierIndex, setCurrentModifierIndex] = useState<number>(0);
  const [objEntity, setObjEntity] = useState<Array<number>>([]);
  const [activeId, setActiveId] = useState("");
  const [parentW, setParentW] = useState(0);
  const [parentH, setParentH] = useState(0);
  const [highestBitValue, setHighestBitValue] = useState(0);
  const [haltPosition, setHaltPosition] = useState(0);
  const [beforeConfirm, setBeforeConfirm] = useState(false);
  const l2account = useAppSelector(selectL2Account);
  const timer = useRef<NodeJS.Timeout>()
  const exploreBoxRef = useRef<HTMLDivElement>(null);

  const handleHighlight = (e: any) => {
    if(highlightedId == "" || highlightedId != e.currentTarget.id) {
      if(objects[0].object_id.length == 0) {
        // The first object is empty and will be removed
        setHighlightedId(String(Number(e.currentTarget.id) - 1));
      } else {
        setHighlightedId(e.currentTarget.id);
      }

      setCurrentModifierIndex(objects[e.currentTarget.id].current_modifier_index);
      setObjEntity(objects[e.currentTarget.id].entity);
      const arr: {id: number, action: string}[]= [];
      objects[e.currentTarget.id].modifiers.map((modifier, index) => {
        arr.push({id: index, action: modifiers[modifier][3]});
      });
      setDropList(arr);
      setBeforeConfirm(false);
    } else if(highlightedId == e.currentTarget.id){
      setHighlightedId("");
      setCurrentModifierIndex(0);
      setObjEntity([]);
      const arr = new Array(8).fill({"id": 0,"action": "?"});
      setDropList(arr);
    }

    if(objects[0].object_id.length == 0) {
      setBeforeConfirm(false);
      const arr = [...objects];
      arr.shift();
      setObjects(arr);
    }
  };

  const Creature = memo(
    function Creature({robot, index}: {robot: ObjectProperty, index: number}) {
      // Convert object_id to hex string
      const objId = robot.object_id.join("");
      const objHex = objId != "" ? "0x" + BigInt(objId).toString(16) : "";
      return (
        <OverlayTrigger key={index} placement="bottom"
          overlay={<Tooltip id={`tooltip-${index}`}><strong>{objHex}</strong></Tooltip>}
        >
          <div className="creature" key={index} id={String(index)} onClick={(e) => {handleHighlight(e);}} style={{ backgroundColor: String(index) === highlightedId ? "yellow" : "none" }}>
            <img className="creatureImg" src={require("./images/robot.png")} />
            <div className="objId">{ objHex }</div>
          </div>
        </OverlayTrigger>
      )
    });

  const CurrentModifierIndex = memo(
    function CurrentModifierIndex({robot}: {robot: ObjectProperty[]}) {
      if(robot.length > 0) {
        const currentMI = "0x" + BigInt(currentModifierIndex).toString(16);
        const binaryString = parseInt(currentMI, 16).toString(2);
        const highestBitValue = binaryString.charAt(0) === '1' ? 1 : 0;
        const lastBit = binaryString.charAt(binaryString.length - 1);
        setHighestBitValue(highestBitValue);
        setHaltPosition(Number(lastBit));

        return (
          <OverlayTrigger key={currentMI} placement="bottom"
            overlay={<Tooltip id={`tooltip-${currentMI}`}><strong>currentModifierIndex: {currentMI}</strong>.</Tooltip>}
          >
            <div className="currentModifierIndex">
              {currentMI}
            </div>
          </OverlayTrigger>
        )
      } else {
        return (
          <div className="currentModifierIndex"></div>
        )
      }
    });

  const ObjectEntity = memo(
    function ObjectEntity({robot}: {robot: ObjectProperty[]}) {
      if(robot.length > 0) {
        return (
          <div className="entity">
            {
              objEntity.map((item, index) => {
                if(entityAttributes.length !=0) {
                  return <span key={index}>{entityAttributes[index]}: {item} </span>;
                } else {
                  return <span key={index}>loading</span>;
                }
              })
            }
          </div>
        )
      } else {
        return (
          <div className="entity"></div>
        )
      }
    });

  /* The modifier must less than eight */
  function encode_modifier(modifiers: Array<bigint>) {
    let c = 0n;
    for (const m of modifiers) {
      c = (c << 8n) + m;
    }
    return c;
  }

  function createCommand(command: bigint, objindex: bigint) {
    return (command << 32n) + objindex;
  }

  function CircleLayout({ children }: { children: any }) {
    const angleStep = 360 / 8;
    return (
      <div className="exploreBox" ref={exploreBoxRef}>
        <CurrentModifierIndex robot={objects} />
        {children.map((child: any, index: any) => {
          const angle = angleStep * (index - 2);
          const r=200;
          const radians = (angle * Math.PI) / 180;
          const x = parentW / 2 - 50 + Math.cos(radians) * r;
          const y = parentH / 2 - 50  + Math.sin(radians) * r;
          const { setNodeRef } = useDroppable({
            id: "droppable" + index
          });

          return (
            <div
              ref={setNodeRef}
              key={index}
              style={{
                position: 'absolute',
                top: `${y}px`,
                left: `${x}px`
              }}
            >
              {child}
            </div>
          );
        })}
      </div>
    );
  }

  const ProgramInfo = memo(
    function ProgramInfo(props: any) {
      const attrArray: any[] = [];
      {props.entity.map((item: any, index: number) => {
        if (item != 0) {
          const obj = {"entity": entityAttributes[index], "item": item};
          attrArray.push(obj);
        }
      })}
      {props.local.map((item: any, index: number) => {
        if (item != 0) {
          const obj = {"local": localAttributes[index], "item": item};
          attrArray.push(obj);
        }
      })}
      return (
        <div className="programInfo">
          <div>{props.name}({props.delay})</div>
          {
            Array.from({ length: 3 }).map((_, i) =>
              <div key={i}>
                {
                  Array.from({ length: 3 }).map((_, j) => {
                    if(attrArray[i * 3 + j] != undefined) {
                      const attr = attrArray[i * 3 + j];
                      if(attr.entity) {
                        return (
                          <div key={j}>[{attr.entity}:{attr.item}]</div>
                        )
                      } else if(attr.local) {
                        return (
                          <div key={j}>[{attr.local}:{attr.item}]</div>
                        )
                      }
                    }
                  })
                }
              </div>
            )
          }
        </div>
      )
    }
  )

  const DragableModifier = memo(
    function DragableModifier(props: any) {
      const {attributes, listeners, setNodeRef, transform, transition} = useSortable({
        id: props.id
      });
      const style = {
        transform: CSS.Transform.toString(transform),
        transition
      }
      return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="programItem">
          <ProgramInfo {...props}></ProgramInfo>
        </div>
      )
    });

  function Preview(props: any) {
    const index = modifiers.findIndex(item => (item[3] == props.id));
    if(index != -1) {
      return (
        <div className="programItem">
          <ProgramInfo
            id={activeId}
            name={modifiers[index][3]}
            entity = {modifiers[index][1]}
            local = {modifiers[index][2]}
            delay = {modifiers[index][0]} /
          >
        </div>
      )
    } else {
      return null;
    }
  }

  function ErrorAlert() {
    return (
      <div>
        { show && (
          <Alert variant="danger" onClose={() => setShow(false)} dismissible style={{width: "200px"}}>
            <Alert.Heading>Error</Alert.Heading>
            <p>{error}</p>
          </Alert>
        )}
      </div>
    );
  }

  function handleDragStart(event: any) {
    const {active} = event;
    setActiveId(active.id);
  }

  function handleDragEnd (event: any) {
    const selected = modifiers.findIndex((item) => item[3] == event.active.id);
    if(selected != -1) {
      if(event.over && typeof event.over.id == "string" && event.over.id.includes("droppable")) {
        const index = Number(event.over.id.replace("droppable", ""));
        const arr = [...dropList];
        arr[index] = {id: selected, action: modifiers[selected][3]};
        setDropList(arr);
      }
    }
    setActiveId("");
  }

  function reboot() {
    const arr = new Array(8).fill({"id": 0,"action": "?"});
    setDropList(arr);
  }

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function queryStateWithRetry(retry: number) {
    for (let i = 0; i< retry; i++) {
      await delay(2000);
      try {
        queryState();
        break;
      } catch(e) {
        continue;
      }
    }
  }

  async function createObject() {
    if(!l2account) {
      setShow(true);
      setError("Please derive processing Key!");
    } else if(objects.length != 0 && objects[0].object_id.length == 0) {
      setShow(true);
      setError("Please confirm!");
    } else {
      setShow(false);
      const arr1 = [...objects];
      arr1.unshift({entity:[], object_id:[], modifiers: [], current_modifier_index:0});
      setObjects(arr1);
      setHighlightedId("0");
      setBeforeConfirm(true);
      const arr = new Array(8).fill({"id": 0,"action": "?"});
      setDropList(arr);
    }
  }

  async function confirm() {
    try {
      const index = dropList.slice().reverse().map((item) => {
        return BigInt(Number(item.id));
      });
      const modifiers: bigint = encode_modifier(index);
      const objIndex = BigInt(objects.length - 1);
      const insObjectCmd = createCommand(CMD_INSTALL_OBJECT, objIndex);
      await send_transaction([insObjectCmd, modifiers, 0n, 0n], l2account!.address);
      await queryStateWithRetry(3);
    } catch(e) {
      setShow(true);
      setError("Error at create object " + e);
    }
  }

  
  async function createPlayer() {
    try {
      if(!l2account) {
        setShow(true);
        setError("Please derive processing Key!");
      } else {
        setShow(false);
        const insPlayerCmd = createCommand(CMD_INSTALL_PLAYER, 0n);
        await send_transaction([insPlayerCmd,0n,0n,0n], l2account.address);
        await queryStateWithRetry(3);
      }
    } catch(e) {
      setShow(true);
      setError("Error at create player " + e);
    }
  }

  function queryState() {
    if(l2account) {
      query_state([], l2account.address).then(res => {
        console.log("Query state", res);
        const data = JSON.parse(res.data);
        console.log("data", data);

        // Convert player_id to hex string
        const player_ids = data[0].player_id.join("");
        const hexString = "0x" + BigInt(player_ids).toString(16);
        setPlayerIds(hexString);

        setLocalValues(data[0].local);

        if(highlightedId != "") {
          if(objects[0].object_id.length == 0 && data[1].length != objects.length - 1) {
            const index = data[1].length - 1;
            setObjects(data[1].slice().reverse());
            setBeforeConfirm(false);
            setHighlightedId("0");
            setCurrentModifierIndex(data[1][index].current_modifier_index);
            setObjEntity(data[1][index].entity);

            // Set dropList
            const arr: {id: number, action: string}[]= [];
            data[1][index].modifiers.map((modifier: number, i: number) => {
              arr.push({id: i, action: modifiers[modifier][3]});
            });
            setDropList(arr);
          }
        } else {
          setObjects(data[1].slice().reverse());
        }
      }).catch(e => {
        setShow(true);
        setError("Error at query state " + e);
      });
    }
  }

  async function queryConfig() {
    try {
      const res = await query_config();
      const data = JSON.parse(res.data);
      setEntityAttributes(data.entity_attributes);
      setLocalAttributes(data.local_attributes);
      setModifiers(data.modifiers);
      if(dropList.length == 0) {
        const arr = new Array(8).fill({"id": 0,"action": "?"});
        setDropList(arr);
      }
    } catch(e) {
      setShow(true);
      setError("Error at query config " + e);
    }
  }

  function resizeChange() {
    if(exploreBoxRef.current) {
      setParentW(exploreBoxRef.current!.offsetWidth);
      setParentH(exploreBoxRef.current!.offsetHeight);
    }
  }

  useEffect(() => {
    queryConfig();
    if(exploreBoxRef.current) {
      setParentW(exploreBoxRef.current!.offsetWidth);
      setParentH(exploreBoxRef.current!.offsetHeight);
    }
    window.addEventListener("resize", resizeChange);
  }, []);

  useEffect(() => {
    if(playerIds == "" && l2account) {
      createPlayer();
    }
    timer.current = setInterval(() => {
      if(playerIds != "") {
        queryState();
      }
    }, 3000);
    return () => { clearInterval(timer.current); };
  }, [l2account, playerIds, highlightedId]);

  return (
    <div className="controller">
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ left: "50%", transform: "translateX(-50%)", position: "absolute" }}>
          <ErrorAlert />
        </div>
        <Row className="player">
          <Col className="local">
            {
              localAttributes.map((item, index) => {
                return (
                  <OverlayTrigger key={index} placement="bottom"
                    overlay={<Tooltip id={`tooltip-${index}`}><strong>{item}</strong></Tooltip>}
                  >
                  <div className="localItem" key={index}>{item}:
                    {
                      localValues.length !=0 ? <span className="value">{localValues[index]}</span> :
                      <span className="value">0</span>
                    }
                  </div>
                  </OverlayTrigger>
                )
              })
            }
          </Col>
          <Col xs={3}>
            <OverlayTrigger key={playerIds} placement="bottom"
              overlay={<Tooltip id={`tooltip-${playerIds}`}><strong>{playerIds}</strong>.</Tooltip>}
            >
              <div className="playerIds">
                playerIds: {playerIds}
              </div>
            </OverlayTrigger>
          </Col>
        </Row>
        <div className="main">
          <div className="creatures">
            <div className="title">CREATURES</div>
            <div className="creatureBox">
              {
                objects.map((item, index) =>
                  <Creature key={index} robot={item} index={index} />
                )
              }
            </div>
            <div className="createObject">
              <button onClick={() => {  createObject(); }}>
                NEW +
              </button>
            </div>
          </div>
          <div className="explore">
            {<ObjectEntity robot={objects} />}
            {
              <CircleLayout>
                {dropList.length != 0 ?
                  dropList.map((item, index) => {
                    let color = "";
                    if(item.action != "?") {
                      color = "yellow";
                    }
                    if(highestBitValue == 1 && haltPosition == index) {
                      color = "red";
                    } else if(highestBitValue == 0 && currentModifierIndex == index && item.action != "?") {
                      color = "green";
                    }

                    return (
                      <OverlayTrigger key={index} placement="bottom"
                      overlay={<Tooltip id={`tooltip-${index}`}><strong>{item.action}</strong></Tooltip>}
                      >
                        <div key={index} className="exploreItem" style={{backgroundColor: color}}>
                          {item.action}
                        </div>
                      </OverlayTrigger>
                    );
                  }) :
                  Array.from({ length: 8 }).map((_, index) =>
                    <OverlayTrigger key={index} placement="bottom"
                    overlay={<Tooltip id={`tooltip-${index}`}><strong>1</strong></Tooltip>}
                    >
                      <div key={index} className="exploreItem">
                        ?
                      </div>
                    </OverlayTrigger>
                  )
                }
              </CircleLayout>
            }
            { beforeConfirm ?
              <button className="confirm" onClick={() => {confirm();}}>Confirm</button>:
              <button className="reboot" onClick={() => {reboot();}}>Reboot</button>
            }
          </div>
          <div className="program">
            <div className="title">PROGRAM</div>
            <div className="draggableBox">
              <SortableContext
                items={modifiers}
                strategy={verticalListSortingStrategy}
              >
                { modifiers.map((item, index) =>
                    <DragableModifier
                      key={index}
                      id={item[3]}
                      name={item[3]}
                      entity = {item[1]}
                      local = {item[2]}
                      delay = {item[0]}
                    />
                  )
                }
              </SortableContext>
              <DragOverlay>
                <Preview id={activeId} />
              </DragOverlay>
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  )
}