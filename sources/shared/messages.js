(function(window){
  'use strict';
  var KEY = 'bb_frontdesk_messages_v1';
  function read(){
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e) { return {}; }
  }
  function write(data){
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {}
    return data;
  }
  function time(){
    return new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
  }
  window.BBMessages = {
    key: KEY,
    get: function(email){ return read()[String(email || '').toLowerCase()] || []; },
    send: function(email, from, text){
      var address = String(email || '').toLowerCase();
      if(!address || !text) return [];
      var data = read();
      data[address] = data[address] || [];
      data[address].push({from:from, text:text, time:time()});
      write(data);
      return data[address];
    },
    seed: function(email){
      var address = String(email || '').toLowerCase();
      if(!address) return [];
      var data = read();
      if(!data[address]){
        data[address] = [{from:'staff', text:'Hi! You are chatting with the Balay Bato front desk. How can we help?', time:time()}];
        write(data);
      }
      return data[address];
    },
    seedConversation: function(email, messages){
      var address = String(email || '').toLowerCase();
      if(!address || !Array.isArray(messages)) return [];
      var data = read();
      if(!data[address] || !data[address].length){
        data[address] = messages.map(function(message){
          return {from:message.from, text:message.text, time:message.time};
        });
        write(data);
      }
      return data[address] || [];
    },
    onChange: function(callback){
      window.addEventListener('storage', function(event){
        if(event.key === KEY) callback(read());
      });
    }
  };
})(window);
