import {guard,clearCookie} from '../../../lib/auth.js';
import {send} from '../../../lib/common.js';
export async function onRequestPost(context){
  const result=await guard(context,true);if(result.failed)return result.failed;
  await context.env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(result.session.token_hash).run();
  return send({ok:true},200,{'Set-Cookie':clearCookie()});
}
