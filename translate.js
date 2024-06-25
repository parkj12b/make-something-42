const axios = require("axios");

module.exports = async function (fromLang, toLang, msg, verbose = false) {
  if (verbose) {
    console.log("translate -- Translate: " + msg);
    console.log("translate -- From: " + fromLang);
    console.log("translate -- To: " + toLang);
  }

  let postReq = await axios({
    method: "post",
    url: "https://api-free.deepl.com/v2/translate",
    params: {
      auth_key: process.env.DEEPLKEY,
//      source_lang: fromLang,
      // target_lang: toLang,
      target_lang: toLang,
      text: msg,
    },
  });

  var resp = {
    from: fromLang,
    to: toLang,
    msg: msg,
    transMsg: postReq.data.translations[0].text,
  };

  // console.log(resp);
  // var transMsg = postReq.data.translations[0].text;

  // console.log(transMsg);

  // postReq.then(function (response) {
  //   // console.log("translate -- " + response.data);
  //   // console.log(typeof response.data);
  //   var transMsg = response.data.translations[0].text;
  //   // console.log("translate -- " + transMsg);
  //   var resp = {
  //     from: fromLang,
  //     to: toLang,
  //     msg: msg,
  //     transMsg: transMsg,
  //   };
  // });

  // create response

  // // create response
  // var resp = {
  //   from: fromLang,
  //   to: toLang,
  //   msg: msg,
  //   transMsg: "fast reply",
  // };
  return resp;
};
