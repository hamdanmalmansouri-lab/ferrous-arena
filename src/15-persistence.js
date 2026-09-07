/* ============================ persistence ============================ */
const save={get(k,d){try{const v=localStorage.getItem('fa2.'+k);return v===null?d:JSON.parse(v);}catch(e){return d;}},
            set(k,v){try{localStorage.setItem('fa2.'+k,JSON.stringify(v));}catch(e){}}};
