'use strict';
/**
 * websocket adapter for sockjs
 */
export default class extends think.adapter.websocket {
  /**
   * run
   * @return {} []
   */
  async run(){
    let sockjs = await think.npm('sockjs');

    let options = {
      log: () => {}
    };
    if(this.config.sockjs_url){
      options.sockjs_url = this.config.sockjs_url;
    }
    let sockjsServer = sockjs.createServer(options);

    //get message type
    let messages = think.extend({}, this.config.messages);
    let open = messages.open;
    delete messages.open;
    let close = messages.close;
    delete messages.close;

    sockjsServer.on('connection', socket => {
          
      //open connection
      if(open){
        this.message(open, undefined, socket);
      }
      //listen close event
      if(close){
        socket.on('close', () => {
          this.message(close, undefined, socket);
        });
      }

      //msg is {event: event, data: data}
      socket.on('data', msg => {
        try{
          msg = JSON.parse(msg);
          if(msg.event && messages[msg.event]){
            this.message(messages[msg.event], msg.data, socket);
          }
        }catch(e){}
      });
      
    });

    let path = this.config.path || '/sockjs';
    sockjsServer.installHandlers(this.server, {prefix: path});
  }
  /**
   * deal message
   * @param  {String} url  []
   * @param  {Mixed} data []
   * @return {}      []
   */
  async message(url, data, socket){
    if(url[0] !== '/'){
      url = `/${url}`;
    }

    let http = await think.http({
      url: url,
      headers: socket.headers,
      ip: socket.remoteAddress
    });
    
    http.data = data;
    http.socket = socket;

    let instance = new this.app(http);
    return instance.run();
  }
}