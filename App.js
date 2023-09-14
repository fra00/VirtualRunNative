import React, { useEffect, useRef, useState } from "react";

import {
  Button,
  View,
  StyleSheet,
  TextInput,
  Text,
  FlatList,
} from "react-native";
import Dialog, {
  DialogButton,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "react-native-popup-dialog";
// import Dialog from "react-native-dialog";
import YoutubePlayer from "react-native-youtube-iframe";
import * as ScreenOrientation from "expo-screen-orientation";
import { virtualRunList } from "./virtualRunList";

export default function App() {
  const arduinoUrl = "http://192.168.1.64/";
  const circonference = 44;

  const _ref = useRef({
    fetching: false,
    fetchCountError: 0,
    startDateTime: null,
    intervalId: null,
    timeRun: 0,
    lastStep: 0,
    lastTime: 0,
  });
  const [videoId, setVideoId] = useState("");
  const [textVideoId, setTextVideoId] = useState("");
  const [playbackRate, setPlaybackRate] = useState(1);
  const [play, setPlay] = useState(false);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(null);
  const [isDialogStartVisible, setIsDialogStartVisible] = useState(false);
  const [statistic, setStatistic] = useState({});
  const [calcStatistic, setCalcStat] = useState({});
  const [isNoConnection, setIsNoConnection] = useState(false);
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);

  useEffect(() => {}, []);

  useEffect(() => {
    if (!ready) return;
    console.log("start reset");
    fetchReset().then(() => {
      fetchDataRun();
      _ref.current.startDateTime = new Date();
      startTimerStatistics();
    });
  }, [ready]);

  useEffect(() => {
    if (playbackRate === 0) {
      setPlay(false);
    } else {
      if (play === false) setPlay(true);
    }
  }, [playbackRate]);

  const startTimerStatistics = () => {
    console.log("init timer");
    _ref.current.intervalId = setInterval(() => {
      let differenza = parseInt(new Date() - _ref.current.startDateTime);
      _ref.current.timeRun = differenza / 1000;
      var ore = Math.floor(differenza / (1000 * 60 * 60));
      var minuti = Math.floor((differenza % (1000 * 60 * 60)) / (1000 * 60));
      var secondi = Math.floor((differenza % (1000 * 60)) / 1000);
      setTime(`${ore}:${minuti}:${secondi}`);
      //console.log(differenza);
    }, 1000);
  };

  const calculateStat = () => {
    let time = _ref.current.timeRun;
    let pulse = statistic?.p || 0;
    let lastPulse = _ref.current.lastStep;
    let lastTime = _ref.current.lastTime;
    console.log("time: " + time);
    console.log("pulse: " + pulse);
    console.log("last pulse: " + lastPulse);
    console.log("last time: " + lastTime);
    console.log("delta " + (pulse - lastPulse));
    let metriDist = pulse * (circonference / 100);
    let avgSpeed = (metriDist / time) * 3.6;
    let distNow = (pulse - lastPulse) * (circonference / 100);
    let speedNow = (distNow / (time - lastTime)) * 3.6;
    setCalcStat({
      distance: metriDist.toFixed(1),
      avgSpeed: avgSpeed.toFixed(1),
      speed: speedNow.toFixed(1),
    });

    _ref.current.lastStep = pulse;
    _ref.current.lastTime = time;
  };

  const fetchReset = async () => {
    var response = await fetchWithTimeout(arduinoUrl + "reset", {
      method: "GET",
    });
    return;
  };

  const fetchDataRun = async () => {
    try {
      if (!ready || !videoId) return;
      if (_ref.current.fetching) {
        console.log("fetch ignored");
        return;
      }
      console.log("start fetch");
      _ref.current.fetching = true;
      let r = await fetchWithTimeout(arduinoUrl + "run", {
        method: "GET",
      })
        .then((data) => {
          //rconsole.log(data);
          _ref.current.fetchCountError = 0;
          if (data && data.json) return data.json();
          return null;
        })
        .catch((error) => {
          console.log(`fetch error: ${error}`);
          //setPlay(false);
          _ref.current.fetchCountError += 1;
          setStatistic({ ...statistic });
          return null;
        });
      _ref.current.fetching = false;
      console.log(r || "");
      if (r) {
        if (r.s === "ok") {
          //if (!r.isRunning) {
          setPlay(r.r != 0);
          //}
          setStatistic(r);
        }
      }
      //r.pulse
    } catch (err) {
      setStatistic({ ...statistic });
      console.log(err);
    }
    // console.log("set statistics");
    // setStatistic({ ...statistic });
  };

  useEffect(() => {
    if (_ref.current.fetchCountError >= 10) {
      setIsNoConnection(true);
      return;
    }
    calculateStat();
    setTimeout(() => {
      fetchDataRun();
    }, 1000);
  }, [statistic]);

  const changePlaybackRate = () => {
    // cambia la velocità tra 0.5, 1 e 2
    setPlaybackRate((prev) => (prev === 2 ? 0 : prev + 0.5));
  };

  const handleStartDialog = () => {
    setVideoId("");
    setReady(false);
    setIsDialogStartVisible(true);
  };

  const handleReset = () => {
    setVideoId("");
    setIsNoConnection(false);
    _ref.current.fetchCountError = 0;
    _ref.current.timeRun = 0;
    clearInterval(_ref.current.intervalId);
    setReady(false);
  };

  const handleCloseStartDialog = () => {
    if (videoId) setReady(true);
    setIsDialogStartVisible(false);
  };

  const handleOkStartDialog = (selected) => {
    let id = selected || textVideoId || "DPHtPbL4Ihc";
    if (id.indexOf("https://youtu.be/") === 0) {
      id = id.replace("https://youtu.be/", "");
    }
    console.log(id);
    setVideoId(id);
    setIsDialogStartVisible(false);
    setPlay(true);
    //initialize and wait all ready
    setTimeout(() => {
      setReady(true);
      setPlay(false);
    }, 35000);
  };

  return (
    <View>
      {!videoId && (
        <View style={styles.containerList}>
          <Text>Seleziona uno dei video virtual running</Text>
          <FlatList
            data={virtualRunList}
            renderItem={({ item }) => (
              <Text
                style={styles.itemList}
                onPress={() => {
                  handleOkStartDialog(item.value);
                }}
              >
                {item.key}
              </Text>
            )}
          />
        </View>
      )}
      {videoId && (
        <>
          <YoutubePlayer
            height={"100%"}
            play={play}
            videoId={videoId}
            initialPlayerParams={{
              controls: false,
              loop: true,
              modestbranding: true,
              rel: false,
            }}
            //volume={0}
            volume={100}
            playbackRate={playbackRate}
          />
          <View style={styles.viewStatistics}>
            <Text style={styles.viewStatisticsText}>
              Tempo trascorso {time}
            </Text>
            <Text style={styles.viewStatisticsText}>
              Distanza percorsa {calcStatistic.distance} metri
            </Text>
            <Text style={styles.viewStatisticsText}>
              Velocità media: {calcStatistic.avgSpeed} Km/h
            </Text>
            <Text style={styles.viewStatisticsText}>
              Velocità media: {calcStatistic.speed} Km/h
            </Text>
          </View>
        </>
      )}

      <View style={styles.buttonStart}>
        <Button title={`Carica`} onPress={handleStartDialog} />
      </View>
      <View style={styles.buttonReset}>
        <Button title={`Nuovo`} onPress={handleReset} />
      </View>

      <Dialog
        visible={videoId != "" && !ready}
        dialogTitle={
          <DialogTitle title="Attendi,e tieniti pronto per iniziare" />
        }
        footer={
          <DialogFooter>
            <DialogButton text="Cancel" onPress={handleReset}></DialogButton>
          </DialogFooter>
        }
      >
        <DialogContent>
          <Text></Text>
        </DialogContent>
      </Dialog>

      <Dialog
        visible={isDialogStartVisible}
        onTouchOutside={handleCloseStartDialog}
        dialogTitle={<DialogTitle title={"Nuovo allenamento"} />}
        footer={
          <DialogFooter>
            <DialogButton
              text="Cancel"
              onPress={handleCloseStartDialog}
            ></DialogButton>
            <DialogButton
              text="Ok"
              onPress={handleOkStartDialog}
            ></DialogButton>
          </DialogFooter>
        }
      >
        <DialogContent>
          <Text>Incolla l'url del video di youtube per la corsa virtuale</Text>
          <Text>Es. https://youtu.be/xxxxxxxx</Text>
          <TextInput
            style={styles.inputText}
            placeholder="video id"
            onChangeText={setTextVideoId}
            value={textVideoId}
          ></TextInput>
        </DialogContent>
      </Dialog>
      <Dialog
        visible={isNoConnection}
        dialogTitle={
          <DialogTitle title="Impossibile connettersi al dispositivo" />
        }
        footer={
          <DialogFooter>
            <DialogButton text="Esci" onPress={handleReset}></DialogButton>
          </DialogFooter>
        }
      >
        <DialogContent>
          <Text>
            Verifica se il dispositivo è acceso o collegato , o prova a spegere
            e riaccenderlo
          </Text>
        </DialogContent>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonPlay: { position: "absolute", left: 10, top: 20, width: 50 },
  buttonStart: { position: "absolute", right: 10, top: 20, width: 150 },
  buttonReset: { position: "absolute", right: 180, top: 20, width: 150 },
  viewStatistics: {
    position: "absolute",
    left: 10,
    top: 20,
    width: 350,
    backgroundColor: "#fff",
    padding: 5,
  },
  viewStatisticsText: { fontSize: 18 },
  buttonWaitReady: {
    position: "absolute",
    right: "calc(50% - 150px)",
    top: "50%",
    width: 150,
  },
  inputText: {
    width: 150,
    height: 40,
    // border: " 1px #000",
    borderWidth: 1,
    //margin: 5,
    padding: 5,
  },
  containerList: {
    padding: 15,
    margin: 15,
  },
  itemList: {
    padding: 10,
    fontSize: 18,
    height: 44,
  },
});

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 6000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);

  return response;
}
