FROM eclipse-mosquitto@sha256:4a46c840adf48e7acd49883206a5c075c14ec95845ee6d30ba935a6719d6b41c
RUN mkdir -p /mosquitto/data/
COPY modules/ws/conf/mosquitto.conf /mosquitto/config/mosquitto.conf
VOLUME /mosquitto/data/