# The Solana SoundBox
Customers can pay by scanning a static QR from wallets like Phantom/Okto Wallet, and the merchant receives an instant audio confirmation of the same - without having to maintain POS systems or Card Machines.

# Hardware Specifications
1. ESP-WROOM-32 Wireless Standard: 802.11 b/g/n, Frequency range: 2.4 GHz - 2.5 GHz (2400M-2483.5M)
2. 3.7V 2400 mAh Li-ion Battery with Charging and Protection Circuit TP4056
3. 4 Ohm 3W Speaker with MAX98375A I2S DAC Module

# Architechture
<img width="686" alt="Screenshot 2024-04-14 at 4 56 35 PM" src="https://github.com/wahidgolam/solanasoundbox/assets/50857521/381be9cb-69db-4f38-8853-b5376c887517">

# Server
Currently configured to be hosted on Firebase Functions. Configure according to host on other platforms like AWS

# Necessary Libraries for Compiling code in ESP32
ESP8266 Audio: https://github.com/earlephilhower/ESP8266Audio

# Extra configurations [soundbox.ino]
1. Configure SSID & Password
2. Variable 'serverName' to the path of the hosted server, along with the correct wallet address to track

