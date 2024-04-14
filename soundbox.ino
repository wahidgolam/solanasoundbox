#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Arduino_JSON.h>

#include "SPIFFS.h"
#include "AudioFileSourceSPIFFS.h"
#include "AudioFileSourceID3.h"
#include "AudioGeneratorMP3.h"
#include "AudioOutputI2S.h"

AudioGeneratorMP3 *mp3;
AudioFileSourceSPIFFS *file;
AudioOutputI2S *out;
AudioFileSourceID3 *id3;


// Digital I/O used
#define I2S_DOUT      25
#define I2S_BCLK      27
#define I2S_LRC       26

String serverName = "https://us-central1-zing-user.cloudfunctions.net/soltxnlogs/getLogs?address=A2WuLqsEP29v3eSPn4HnbwR7iEB791muFAshDs6CFod7";

unsigned long lastTime = 0;
unsigned long fetchLogsDelay = 5000;

String signatureList[50];
int sig = 0;

void playSound(int choose) {
  audioLogger = &Serial;
  //choose file
  if (choose == -1) {
    file = new AudioFileSourceSPIFFS("/poweron.mp3");
  }
  else if (choose == -2) {
    file = new AudioFileSourceSPIFFS("/connected.mp3");
  }

  id3 = new AudioFileSourceID3(file);
  id3->RegisterMetadataCB(MDCallback, (void*)"ID3TAG");
  out = new AudioOutputI2S();
  out->SetPinout(27, 26, 25);
  mp3 = new AudioGeneratorMP3();
  mp3->begin(id3, out);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  SPIFFS.begin();
  //playSound(-1);
  Serial.printf("Connecting to WiFi");
  WiFi.begin("Pixel_7800", "adgjmptw");
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
    Serial.print(".");
  }
  playSound(-2);
  Serial.println("Connected!");
  fetchLogs(0);
}

void loop() {
  if ((millis() - lastTime) > fetchLogsDelay) {
    fetchLogs(1);
  }
  if (mp3->isRunning()) {
    if (!mp3->loop()) mp3->stop();
  } else {
    Serial.printf("MP3 done\n");
    delay(1000);
  }
}


void fetchLogs(int x) {
  if (WiFi.status() == WL_CONNECTED) {

    HTTPClient http;
    http.setTimeout(20000);

    String serverPath = serverName;

    if (http.begin(serverPath.c_str())) {
      int httpResponseCode = http.GET();

      if (httpResponseCode > 0) {
        String payload = http.getString();
        JSONVar responseJSON = JSON.parse(payload);

        if (responseJSON.hasOwnProperty("txlist")) {
          JSONVar txlist = responseJSON["txlist"];

          for (int i = 0; i < txlist.length(); i++) {
            JSONVar txn = txlist[i];

            if (!includes(signatureList, JSON.stringify(txn["signature"]))) {
              Serial.print("New Signature: ");
              Serial.println(txn["signature"]);

              signatureList[sig++ % 50] = JSON.stringify(txn["signature"]);

              //init speaker if in loop
              if (x == 1 || x == 0) {
                String message = "You have received " + String((JSON.stringify(txn["uiAmount"])).toFloat(), 4) + " " + JSON.stringify(txn["token"]) + " into your Solana Wallet!";
                Serial.println(message);
                char buf[60];
                message.toCharArray(buf, message.length());
              }
            }
          }
        }
      }
      else {
        Serial.print("Error code: ");
        Serial.println(http.errorToString(httpResponseCode).c_str());
      }
      http.end();
    }
    else {
      Serial.println("Unable to connect");
    }

  }
  else {
    Serial.println("WiFi Disconnected");
  }
  lastTime = millis();

}

boolean includes(String array[], String element) {
  for (int i = 0; i < 50; i++) {
    if (array[i] == element) {
      return true;
    }
  }
  return false;
}

// Called when a metadata event occurs (i.e. an ID3 tag, an ICY block, etc.
void MDCallback(void *cbData, const char *type, bool isUnicode, const char *string)
{
  (void)cbData;
  Serial.printf("ID3 callback for: %s = '", type);

  if (isUnicode) {
    string += 2;
  }

  while (*string) {
    char a = *(string++);
    if (isUnicode) {
      string++;
    }
    Serial.printf("%c", a);
  }
  Serial.printf("'\n");
  Serial.flush();
}
