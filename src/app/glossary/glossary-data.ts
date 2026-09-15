// Generated from the CryptoBot glossary (Spanish). Keep entries in their thematic source order;
// the UI sorts and filters. Add new terms at the end of the closest block.

export type GlossaryCategory =
  | 'Cuentas y programas'
  | 'Transacciones y fees'
  | 'Consenso y red'
  | 'Tokens y NFTs'
  | 'DeFi y trading'
  | 'Economía y governance'
  | 'Seguridad y custodia'
  | 'Identidad y compliance'
  | 'Infra, RPC y datos'
  | 'Bots y agentes IA'
  | 'Rust y Anchor'
  | 'Criptografía y PoW'
  | 'Métricas y benchmarks'
  | 'Conceptos generales';

export interface GlossaryEntry {
  term: string;
  definition: string;
  category: GlossaryCategory;
}

export const GLOSSARY_CATEGORIES: readonly GlossaryCategory[] = [
  'Cuentas y programas',
  'Transacciones y fees',
  'Consenso y red',
  'Tokens y NFTs',
  'DeFi y trading',
  'Economía y governance',
  'Seguridad y custodia',
  'Identidad y compliance',
  'Infra, RPC y datos',
  'Bots y agentes IA',
  'Rust y Anchor',
  'Criptografía y PoW',
  'Métricas y benchmarks',
  'Conceptos generales',
];

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    term: 'nonce',
    definition: 'número o valor que cambiás para producir un hash distinto durante una búsqueda o desafío criptográfico.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'hash',
    definition: 'huella digital de datos; misma entrada da mismo hash, cambiar un bit cambia completamente el resultado.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'target',
    definition: 'límite que define qué hashes son válidos; cuanto más difícil es alcanzar el target, más trabajo computacional hace falta.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'validator',
    definition: 'nodo que participa en validar transacciones y mantener el consenso de la red Solana.',
    category: 'Consenso y red',
  },
  {
    term: 'program',
    definition: 'código ejecutable on-chain en Solana; equivalente aproximado a un smart contract.',
    category: 'Cuentas y programas',
  },
  {
    term: 'PDA',
    definition: 'Program Derived Address; dirección generada de forma determinística que un programa puede usar/controlar sin private key.',
    category: 'Cuentas y programas',
  },
  {
    term: 'RPC',
    definition: 'API para consultar la blockchain y enviar transacciones a un nodo.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'wallet',
    definition: 'software que administra tus claves y firma transacciones; no "guarda" las monedas físicamente.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'transaction',
    definition: 'paquete firmado con una o varias instrucciones que intenta modificar el estado de la blockchain.',
    category: 'Transacciones y fees',
  },
  {
    term: 'slot',
    definition: 'unidad de tiempo/turno en Solana en la que un líder puede producir entradas del ledger.',
    category: 'Consenso y red',
  },
  {
    term: 'blockhash',
    definition: 'hash reciente usado dentro de una transacción, entre otras cosas para evitar que pueda reutilizarse indefinidamente.',
    category: 'Transacciones y fees',
  },
  {
    term: 'public key',
    definition: 'identificador público derivado de una clave privada; puede compartirse.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'private key',
    definition: 'secreto criptográfico que permite firmar; quien la tiene controla esa identidad.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'keypair',
    definition: 'combinación de private key + public key.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'signature',
    definition: 'prueba criptográfica de que el dueño de una private key autorizó determinados datos.',
    category: 'Transacciones y fees',
  },
  {
    term: 'account',
    definition: 'unidad donde Solana guarda estado, datos, SOL y metadatos; no significa necesariamente "usuario".',
    category: 'Cuentas y programas',
  },
  {
    term: 'owner',
    definition: 'programa que tiene autoridad para modificar los datos de una account.',
    category: 'Cuentas y programas',
  },
  {
    term: 'lamport',
    definition: 'unidad mínima de SOL; 1 SOL = 1.000.000.000 lamports.',
    category: 'Cuentas y programas',
  },
  {
    term: 'instruction',
    definition: 'llamada concreta a un program indicando cuentas, datos y operación a ejecutar.',
    category: 'Transacciones y fees',
  },
  {
    term: 'program_id',
    definition: 'dirección pública que identifica un programa desplegado en Solana.',
    category: 'Cuentas y programas',
  },
  {
    term: 'signer',
    definition: 'account cuya firma es requerida para una operación.',
    category: 'Transacciones y fees',
  },
  {
    term: 'writable account',
    definition: 'account que una transacción pretende modificar.',
    category: 'Cuentas y programas',
  },
  {
    term: 'read-only account',
    definition: 'account que una transacción solo necesita leer.',
    category: 'Cuentas y programas',
  },
  {
    term: 'state',
    definition: 'información actual de la blockchain, como balances, configuraciones y datos de programas.',
    category: 'Cuentas y programas',
  },
  {
    term: 'ledger',
    definition: 'historial ordenado de transacciones y cambios aceptados por la red.',
    category: 'Consenso y red',
  },
  {
    term: 'block',
    definition: 'agrupación de entradas/transacciones confirmadas asociadas a determinados slots.',
    category: 'Consenso y red',
  },
  {
    term: 'cluster',
    definition: 'conjunto de nodos que forman una red Solana, por ejemplo Devnet o Mainnet.',
    category: 'Consenso y red',
  },
  {
    term: 'mainnet',
    definition: 'red principal donde los activos y SOL tienen valor real.',
    category: 'Consenso y red',
  },
  {
    term: 'devnet',
    definition: 'red pública de prueba para desarrollar sin usar dinero real.',
    category: 'Consenso y red',
  },
  {
    term: 'local validator',
    definition: 'red Solana local que corre en tu PC para desarrollar y testear.',
    category: 'Consenso y red',
  },
  {
    term: 'consensus',
    definition: 'mecanismo mediante el cual los nodos acuerdan cuál es el estado válido de la red.',
    category: 'Consenso y red',
  },
  {
    term: 'Proof of Stake',
    definition: 'sistema donde validators participan usando SOL delegado/stakeado en vez de competir mediante minería PoW.',
    category: 'Consenso y red',
  },
  {
    term: 'stake',
    definition: 'SOL bloqueado/delegado para participar en la seguridad y economía del consenso.',
    category: 'Consenso y red',
  },
  {
    term: 'leader',
    definition: 'validator elegido para producir entradas durante determinados slots.',
    category: 'Consenso y red',
  },
  {
    term: 'epoch',
    definition: 'conjunto grande de slots usado para organizar cosas como el calendario de validators y staking.',
    category: 'Consenso y red',
  },
  {
    term: 'finality',
    definition: 'grado de certeza de que una transacción ya no debería revertirse.',
    category: 'Consenso y red',
  },
  {
    term: 'confirmation',
    definition: 'nivel de confianza de que una transacción fue procesada y aceptada por la red.',
    category: 'Consenso y red',
  },
  {
    term: 'fee',
    definition: 'costo pagado por procesar una transacción.',
    category: 'Transacciones y fees',
  },
  {
    term: 'priority fee',
    definition: 'pago adicional para aumentar la prioridad de procesamiento de una transacción.',
    category: 'Transacciones y fees',
  },
  {
    term: 'compute unit (CU)',
    definition: 'unidad que mide cuánto cómputo consume un programa dentro de una transacción.',
    category: 'Transacciones y fees',
  },
  {
    term: 'compute budget',
    definition: 'límite y configuración del cómputo disponible para una transacción.',
    category: 'Transacciones y fees',
  },
  {
    term: 'CPI',
    definition: 'Cross Program Invocation; cuando un programa Solana llama a otro programa.',
    category: 'Cuentas y programas',
  },
  {
    term: 'seed',
    definition: 'dato usado para derivar una PDA de forma determinística.',
    category: 'Cuentas y programas',
  },
  {
    term: 'bump',
    definition: 'valor adicional usado para encontrar una PDA válida fuera de la curva criptográfica normal.',
    category: 'Cuentas y programas',
  },
  {
    term: 'rent',
    definition: 'concepto histórico/económico relacionado con mantener datos almacenados en accounts; hoy normalmente se trabaja con accounts rent-exempt.',
    category: 'Cuentas y programas',
  },
  {
    term: 'serialization',
    definition: 'convertir estructuras de datos a bytes para poder almacenarlas o transmitirlas.',
    category: 'Cuentas y programas',
  },
  {
    term: 'deserialization',
    definition: 'reconstruir estructuras a partir de esos bytes.',
    category: 'Cuentas y programas',
  },
  {
    term: 'IDL',
    definition: 'descripción de la interfaz de un programa Anchor; define instrucciones, accounts y tipos.',
    category: 'Rust y Anchor',
  },
  {
    term: 'Anchor',
    definition: 'framework de Rust para desarrollar programas Solana con menos boilerplate.',
    category: 'Rust y Anchor',
  },
  {
    term: 'Rust',
    definition: 'lenguaje más usado para escribir programas Solana.',
    category: 'Rust y Anchor',
  },
  {
    term: 'SPL',
    definition: 'conjunto de estándares/programas comunes del ecosistema Solana.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'SPL Token',
    definition: 'programa estándar para crear y manejar tokens fungibles y otros activos.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'mint',
    definition: 'account que define un token: supply, decimales y autoridades.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'token account',
    definition: 'account que guarda el balance de un token específico para un propietario.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'ATA',
    definition: 'Associated Token Account; token account estándar derivada de wallet + mint.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'mint authority',
    definition: 'clave o PDA autorizada a crear nuevas unidades de un token.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'freeze authority',
    definition: 'autoridad que puede congelar ciertas token accounts si el token lo permite.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'decimals',
    definition: 'cantidad de posiciones decimales con las que se representa un token.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'supply',
    definition: 'cantidad total emitida de un token.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'native token',
    definition: 'activo propio de la red; en Solana es SOL.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'stablecoin',
    definition: 'token diseñado para mantener un valor estable, por ejemplo USDC.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'smart contract',
    definition: 'nombre genérico para código blockchain; en Solana normalmente se dice program.',
    category: 'Cuentas y programas',
  },
  {
    term: 'on-chain',
    definition: 'lógica o datos almacenados/ejecutados dentro de la blockchain.',
    category: 'Cuentas y programas',
  },
  {
    term: 'off-chain',
    definition: 'lógica o datos procesados fuera de la blockchain.',
    category: 'Cuentas y programas',
  },
  {
    term: 'oracle',
    definition: 'servicio que introduce información externa, como precios, dentro del mundo blockchain.',
    category: 'DeFi y trading',
  },
  {
    term: 'DEX',
    definition: 'exchange descentralizado ejecutado mediante programas on-chain.',
    category: 'DeFi y trading',
  },
  {
    term: 'AMM',
    definition: 'mecanismo automático que permite intercambiar tokens usando pools de liquidez.',
    category: 'DeFi y trading',
  },
  {
    term: 'liquidity pool',
    definition: 'reserva conjunta de tokens usada para swaps y mercados descentralizados.',
    category: 'DeFi y trading',
  },
  {
    term: 'swap',
    definition: 'intercambio de un token por otro.',
    category: 'DeFi y trading',
  },
  {
    term: 'slippage',
    definition: 'diferencia tolerada entre el precio esperado y el precio real de ejecución.',
    category: 'DeFi y trading',
  },
  {
    term: 'liquidity',
    definition: 'facilidad con la que podés comprar o vender sin mover demasiado el precio.',
    category: 'DeFi y trading',
  },
  {
    term: 'TVL',
    definition: 'Total Value Locked; valor total depositado dentro de un protocolo DeFi.',
    category: 'DeFi y trading',
  },
  {
    term: 'DeFi',
    definition: 'servicios financieros construidos mediante protocolos blockchain.',
    category: 'DeFi y trading',
  },
  {
    term: 'dApp',
    definition: 'aplicación cuyo backend o parte importante de su lógica usa blockchain.',
    category: 'Conceptos generales',
  },
  {
    term: 'airdrop',
    definition: 'distribución de tokens; en Devnet también se usa para recibir SOL de prueba.',
    category: 'Economía y governance',
  },
  {
    term: 'faucet',
    definition: 'servicio que entrega tokens de prueba para desarrollo.',
    category: 'Economía y governance',
  },
  {
    term: 'explorer',
    definition: 'web para inspeccionar transactions, accounts, programs y bloques.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'transaction signature',
    definition: 'identificador criptográfico de una transacción firmada, usado para buscarla en un explorer.',
    category: 'Transacciones y fees',
  },
  {
    term: 'message',
    definition: 'parte de una transacción que contiene instrucciones, cuentas y blockhash antes de aplicar las firmas.',
    category: 'Transacciones y fees',
  },
  {
    term: 'recent blockhash',
    definition: 'blockhash reciente que limita la vida útil de una transacción.',
    category: 'Transacciones y fees',
  },
  {
    term: 'replay attack',
    definition: 'intento de reutilizar una transacción válida para ejecutarla otra vez; los mecanismos de blockhash ayudan a prevenirlo.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'atomicity',
    definition: 'propiedad por la que todas las instrucciones de una transacción funcionan o toda la transacción falla.',
    category: 'Transacciones y fees',
  },
  {
    term: 'deterministic',
    definition: 'mismo estado + misma entrada producen el mismo resultado; requisito clave para lógica on-chain.',
    category: 'Cuentas y programas',
  },
  {
    term: 'immutable',
    definition: 'algo que no puede modificarse después de quedar registrado, según las reglas del sistema.',
    category: 'Cuentas y programas',
  },
  {
    term: 'upgrade authority',
    definition: 'clave que puede actualizar un programa si fue desplegado como actualizable.',
    category: 'Cuentas y programas',
  },
  {
    term: 'program deployment',
    definition: 'proceso de subir el bytecode de un programa a Solana.',
    category: 'Cuentas y programas',
  },
  {
    term: 'BPF/SBF',
    definition: 'formato/runtime de ejecución usado por programas Solana compilados.',
    category: 'Cuentas y programas',
  },
  {
    term: 'serialization format',
    definition: 'convención para transformar objetos en bytes, por ejemplo Borsh.',
    category: 'Cuentas y programas',
  },
  {
    term: 'Borsh',
    definition: 'formato de serialización muy utilizado en Solana/Anchor.',
    category: 'Cuentas y programas',
  },
  {
    term: 'blockchain',
    definition: 'base de estado/historial replicada entre nodos donde las reglas se verifican criptográficamente.',
    category: 'Consenso y red',
  },
  {
    term: 'node',
    definition: 'máquina conectada a la red que participa consultando, propagando o validando información.',
    category: 'Consenso y red',
  },
  {
    term: 'full node',
    definition: 'nodo que conserva y verifica información de la blockchain según su rol.',
    category: 'Consenso y red',
  },
  {
    term: 'gossip',
    definition: 'mecanismo por el cual los nodos intercambian información sobre la red.',
    category: 'Consenso y red',
  },
  {
    term: 'fork',
    definition: 'dos historias temporales diferentes de la blockchain que compiten hasta que el consenso elige una.',
    category: 'Consenso y red',
  },
  {
    term: 'reorg',
    definition: 'cambio donde una rama de la historia termina reemplazando otra.',
    category: 'Consenso y red',
  },
  {
    term: 'double spend',
    definition: 'intento de gastar los mismos fondos dos veces.',
    category: 'Consenso y red',
  },
  {
    term: 'Merkle tree',
    definition: 'estructura basada en hashes que permite probar eficientemente que ciertos datos pertenecen a un conjunto.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'proof',
    definition: 'evidencia criptográfica verificable de que cierta condición se cumple.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'PoW',
    definition: 'Proof of Work; mecanismo donde se demuestra trabajo computacional, típicamente buscando hashes válidos.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'hashrate',
    definition: 'cantidad de hashes calculados por segundo.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'difficulty',
    definition: 'medida de cuán difícil es encontrar una solución válida en un desafío de hashing.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'preimage',
    definition: 'dato original que entra a una función hash.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'collision',
    definition: 'dos entradas distintas que producen el mismo hash.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'SHA-256',
    definition: 'función hash criptográfica muy conocida que produce 256 bits.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'ed25519',
    definition: 'esquema criptográfico de firmas usado ampliamente en Solana.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'base58',
    definition: 'codificación usada para mostrar muchas claves y direcciones Solana de forma legible.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'address',
    definition: 'representación pública usada para identificar accounts o programs.',
    category: 'Cuentas y programas',
  },
  {
    term: 'seed phrase',
    definition: 'palabras que permiten recuperar claves de una wallet; debe tratarse como secreto absoluto.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'custodial wallet',
    definition: 'wallet donde un tercero controla realmente las claves.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'non-custodial wallet',
    definition: 'wallet donde vos controlás tus propias claves.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'multisig',
    definition: 'esquema donde hacen falta varias firmas para autorizar una operación.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'cold wallet',
    definition: 'claves guardadas fuera de dispositivos conectados regularmente a Internet.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'hot wallet',
    definition: 'wallet conectada y lista para firmar operaciones frecuentemente.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'hardware wallet',
    definition: 'dispositivo físico diseñado para mantener la private key aislada.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'bridge',
    definition: 'sistema que mueve o representa activos entre blockchains distintas.',
    category: 'Conceptos generales',
  },
  {
    term: 'wrapped token',
    definition: 'representación tokenizada de otro activo dentro de una red.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'L1',
    definition: 'blockchain base como Solana, Bitcoin o Ethereum.',
    category: 'Conceptos generales',
  },
  {
    term: 'L2',
    definition: 'red construida encima de otra blockchain para escalar o añadir funciones.',
    category: 'Conceptos generales',
  },
  {
    term: 'TPS',
    definition: 'transactions per second; cantidad de transacciones procesadas por segundo.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'throughput',
    definition: 'capacidad total de procesamiento de una red.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'latency',
    definition: 'tiempo entre enviar una operación y verla procesada/confirmada.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'MEV',
    definition: 'valor extraíble mediante el orden, inclusión o exclusión estratégica de transacciones.',
    category: 'DeFi y trading',
  },
  {
    term: 'front-running',
    definition: 'intentar ejecutar una transacción antes que otra aprovechando información observada.',
    category: 'DeFi y trading',
  },
  {
    term: 'sandwich attack',
    definition: 'ataque DeFi donde alguien opera antes y después de una víctima para beneficiarse de su swap.',
    category: 'DeFi y trading',
  },
  {
    term: 'rug pull',
    definition: 'proyecto donde responsables retiran liquidez/fondos o abandonan dejando a usuarios perjudicados.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'tokenomics',
    definition: 'reglas económicas de emisión, distribución y uso de un token.',
    category: 'Economía y governance',
  },
  {
    term: 'governance',
    definition: 'sistema mediante el cual una comunidad/protocolo toma decisiones.',
    category: 'Economía y governance',
  },
  {
    term: 'DAO',
    definition: 'organización coordinada en parte mediante reglas y votaciones blockchain.',
    category: 'Economía y governance',
  },
  {
    term: 'NFT',
    definition: 'token que representa un activo único o distinguible.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'metadata',
    definition: 'información descriptiva asociada a un token o NFT.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'compressed NFT',
    definition: 'NFT que usa estructuras como Merkle trees para reducir costos de almacenamiento.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'Web3',
    definition: 'término amplio para aplicaciones y sistemas que usan blockchains, wallets y propiedad criptográfica.',
    category: 'Conceptos generales',
  },
  {
    term: 'protocol',
    definition: 'conjunto de reglas y programas que definen cómo funciona un sistema blockchain o DeFi.',
    category: 'Consenso y red',
  },
  {
    term: 'SDK',
    definition: 'librería que facilita interactuar con Solana desde JavaScript, Rust, Java u otros lenguajes.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'web3.js',
    definition: 'librería JavaScript histórica/popular para interactuar con Solana.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'client',
    definition: 'aplicación que construye y envía transacciones a un program.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'indexer',
    definition: 'servicio que procesa blockchain y la reorganiza para hacer búsquedas/consultas más cómodas.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'websocket',
    definition: 'conexión persistente usada para recibir eventos/cambios de Solana en tiempo real.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'subscription',
    definition: 'suscripción RPC para recibir actualizaciones de accounts, logs o signatures.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'logs',
    definition: 'mensajes generados durante la ejecución de un program, útiles para debugging.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'simulation',
    definition: 'ejecución previa de una transacción sin confirmarla para detectar errores y estimar consumo.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'preflight',
    definition: 'chequeo/simulación que un RPC puede hacer antes de enviar realmente una transacción.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'commitment (RPC)',
    definition: 'nivel solicitado de confirmación al consultar Solana, como processed, confirmed o finalized.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'processed',
    definition: 'el nodo procesó la transacción, pero todavía tiene menor garantía de permanencia.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'confirmed',
    definition: 'la transacción tiene respaldo mayor del consenso.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'finalized',
    definition: 'nivel de confirmación más fuerte habitual; se considera prácticamente definitivo.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'slot leader',
    definition: 'validator responsable de producir entradas para un slot concreto.',
    category: 'Consenso y red',
  },
  {
    term: 'block time',
    definition: 'timestamp aproximado asociado a un bloque/slot confirmado.',
    category: 'Consenso y red',
  },
  {
    term: 'genesis block',
    definition: 'estado/bloque inicial desde el que nace una blockchain.',
    category: 'Consenso y red',
  },
  {
    term: 'genesis hash',
    definition: 'identificador criptográfico del genesis de una red específica.',
    category: 'Consenso y red',
  },
  {
    term: 'chain id',
    definition: 'identificador de una blockchain en ecosistemas que usan ese concepto; Solana distingue redes principalmente por cluster/genesis.',
    category: 'Consenso y red',
  },
  {
    term: 'program account',
    definition: 'account ejecutable que contiene o referencia código de un programa.',
    category: 'Cuentas y programas',
  },
  {
    term: 'data account',
    definition: 'account usada principalmente para almacenar estado de un programa.',
    category: 'Cuentas y programas',
  },
  {
    term: 'authority',
    definition: 'clave o PDA con permiso para ejecutar una acción específica.',
    category: 'Cuentas y programas',
  },
  {
    term: 'delegate',
    definition: 'entidad autorizada temporalmente para operar cierta cantidad de tokens en nombre del dueño.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'close authority',
    definition: 'autoridad capaz de cerrar una token account en determinados casos.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'rent-exempt',
    definition: 'account con suficiente balance/condición para no depender del antiguo cobro periódico de rent.',
    category: 'Cuentas y programas',
  },
  {
    term: 'account discriminator',
    definition: 'bytes usados por Anchor para identificar qué tipo de estructura guarda una account.',
    category: 'Rust y Anchor',
  },
  {
    term: 'instruction discriminator',
    definition: 'identificador usado por Anchor para distinguir qué función del programa se quiere ejecutar.',
    category: 'Rust y Anchor',
  },
  {
    term: 'account constraint',
    definition: 'regla de Anchor que valida signer, owner, seeds, mutabilidad, relaciones, etc.',
    category: 'Rust y Anchor',
  },
  {
    term: 'IDL client',
    definition: 'cliente generado o construido usando la IDL para llamar un program de forma más cómoda.',
    category: 'Rust y Anchor',
  },
  {
    term: 'token program',
    definition: 'programa oficial que implementa operaciones estándar de tokens.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'Token-2022',
    definition: 'versión/extensión moderna del estándar de tokens de Solana con funcionalidades adicionales.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'Jupiter',
    definition: 'agregador de liquidez/rutas de swaps del ecosistema Solana.',
    category: 'DeFi y trading',
  },
  {
    term: 'route',
    definition: 'camino elegido entre uno o varios pools/DEX para realizar un swap.',
    category: 'DeFi y trading',
  },
  {
    term: 'quote',
    definition: 'estimación de cuánto recibirías antes de ejecutar un swap.',
    category: 'DeFi y trading',
  },
  {
    term: 'price impact',
    definition: 'cuánto cambia el precio de mercado debido al tamaño de tu operación.',
    category: 'DeFi y trading',
  },
  {
    term: 'liquidation',
    definition: 'cierre forzado de una posición cuando ya no cumple requisitos de colateral.',
    category: 'DeFi y trading',
  },
  {
    term: 'collateral',
    definition: 'activo depositado como garantía para préstamos o posiciones.',
    category: 'DeFi y trading',
  },
  {
    term: 'leverage',
    definition: 'exposición superior al capital propio mediante deuda o derivados.',
    category: 'DeFi y trading',
  },
  {
    term: 'perpetual',
    definition: 'contrato derivado sin fecha de vencimiento usado para apostar por subidas o bajadas de precio.',
    category: 'DeFi y trading',
  },
  {
    term: 'oracle price',
    definition: 'precio publicado por un oracle para que los programas puedan usar información externa.',
    category: 'DeFi y trading',
  },
  {
    term: 'Pyth',
    definition: 'red/oracle muy utilizada en Solana para datos de precios financieros.',
    category: 'DeFi y trading',
  },
  {
    term: 'proof of history',
    definition: 'mecanismo de reloj criptográfico de Solana que ayuda a ordenar eventos; no es por sí solo el consenso completo.',
    category: 'Consenso y red',
  },
  {
    term: 'Tower BFT',
    definition: 'componente del consenso de Solana basado en Proof of Stake y votaciones de validators.',
    category: 'Consenso y red',
  },
  {
    term: 'Turbine',
    definition: 'protocolo de propagación de datos/bloques en Solana.',
    category: 'Consenso y red',
  },
  {
    term: 'Gulf Stream',
    definition: 'término histórico de Solana asociado al envío anticipado de transacciones hacia futuros líderes.',
    category: 'Consenso y red',
  },
  {
    term: 'QUIC',
    definition: 'protocolo de transporte usado por Solana para comunicación de red en varias rutas críticas.',
    category: 'Consenso y red',
  },
  {
    term: 'shred',
    definition: 'fragmento en el que Solana divide datos del ledger para distribuirlos eficientemente.',
    category: 'Consenso y red',
  },
  {
    term: 'leader schedule',
    definition: 'calendario que indica qué validator será líder en determinados slots.',
    category: 'Consenso y red',
  },
  {
    term: 'vote transaction',
    definition: 'transacción mediante la cual validators expresan votos de consenso.',
    category: 'Consenso y red',
  },
  {
    term: 'vote account',
    definition: 'account asociada al comportamiento de votación de un validator.',
    category: 'Consenso y red',
  },
  {
    term: 'stake account',
    definition: 'account que mantiene SOL destinado a staking/delegación.',
    category: 'Consenso y red',
  },
  {
    term: 'delegation',
    definition: 'asignar stake a un validator para participar indirectamente en el consenso.',
    category: 'Consenso y red',
  },
  {
    term: 'inflation',
    definition: 'creación programada de nuevos tokens como parte de la economía de la red.',
    category: 'Economía y governance',
  },
  {
    term: 'rewards',
    definition: 'pagos obtenidos por staking/validación según las reglas del protocolo.',
    category: 'Economía y governance',
  },
  {
    term: 'burn',
    definition: 'destruir tokens de forma permanente reduciendo el supply.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'airdrop scam',
    definition: 'estafa donde tokens o enlaces falsos intentan hacerte firmar operaciones maliciosas.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'drainer',
    definition: 'contrato/app maliciosa diseñada para vaciar assets de una wallet mediante firmas engañosas.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'signature request',
    definition: 'pedido que una dApp envía a tu wallet para que autorices algo.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'transaction signing',
    definition: 'proceso de aprobar criptográficamente una transacción antes de enviarla.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'message signing',
    definition: 'firmar un mensaje sin necesariamente ejecutar una transacción on-chain.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'wallet adapter',
    definition: 'librería que permite conectar una web con wallets como Phantom o Solflare.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'Phantom',
    definition: 'wallet popular del ecosistema Solana.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'Solflare',
    definition: 'otra wallet popular enfocada en Solana.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'explorer.solana.com',
    definition: 'explorador oficial para inspeccionar actividad de Solana.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'Solscan',
    definition: 'explorador alternativo popular para revisar cuentas y transacciones Solana.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'airdrop Devnet',
    definition: 'mecanismo para obtener SOL de prueba y pagar fees durante desarrollo.',
    category: 'Economía y governance',
  },
  {
    term: 'faucet rate limit',
    definition: 'límite impuesto por faucets públicos para evitar abuso de SOL de prueba.',
    category: 'Economía y governance',
  },
  {
    term: 'program test',
    definition: 'framework/entorno para probar programas Solana sin depender de Mainnet.',
    category: 'Rust y Anchor',
  },
  {
    term: 'integration test',
    definition: 'test que prueba varias piezas juntas, por ejemplo cliente + program + accounts.',
    category: 'Rust y Anchor',
  },
  {
    term: 'unit test',
    definition: 'prueba pequeña de una función o lógica aislada.',
    category: 'Rust y Anchor',
  },
  {
    term: 'audit',
    definition: 'revisión profunda de seguridad del código, especialmente importante antes de manejar dinero real.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'exploit',
    definition: 'uso de un bug para violar las reglas esperadas del protocolo.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'overflow',
    definition: 'error numérico al exceder el rango permitido por un tipo entero.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'underflow',
    definition: 'error numérico al intentar bajar de cero en un entero sin signo.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'integer arithmetic',
    definition: 'matemática con enteros usada para evitar errores de precisión en dinero.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'floating point',
    definition: 'representación decimal aproximada; normalmente se evita para balances on-chain.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'checked math',
    definition: 'operaciones numéricas que detectan overflow/underflow en vez de ignorarlos.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'access control',
    definition: 'reglas que definen quién puede ejecutar cada acción.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'reentrancy',
    definition: 'clase de vulnerabilidad donde una llamada externa vuelve a entrar en lógica antes de terminar; más famosa en Ethereum, pero el concepto de seguridad importa.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'account validation',
    definition: 'comprobar que las accounts recibidas son realmente las esperadas antes de operar con ellas.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'program-derived signer',
    definition: 'PDA que puede actuar como signer mediante reglas del runtime cuando el program usa las seeds correctas.',
    category: 'Cuentas y programas',
  },
  {
    term: 'seed collision',
    definition: 'diseño defectuoso de seeds que hace que datos conceptualmente distintos puedan derivar la misma PDA.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'canonical bump',
    definition: 'bump estándar escogido para derivar de forma consistente una PDA.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'account close',
    definition: 'liberar una account y normalmente transferir sus lamports restantes a otra cuenta.',
    category: 'Cuentas y programas',
  },
  {
    term: 'serialization attack',
    definition: 'manipulación de datos serializados para provocar interpretaciones inesperadas si las validaciones son malas.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'sysvar',
    definition: 'account especial que expone datos del runtime, como reloj u otros parámetros de la red.',
    category: 'Cuentas y programas',
  },
  {
    term: 'Clock sysvar',
    definition: 'fuente on-chain de información temporal/slot disponible para programas.',
    category: 'Cuentas y programas',
  },
  {
    term: 'system program',
    definition: 'programa nativo responsable de crear accounts y transferir SOL, entre otras funciones básicas.',
    category: 'Cuentas y programas',
  },
  {
    term: 'rent sysvar',
    definition: 'información histórica relacionada con reglas de rent.',
    category: 'Cuentas y programas',
  },
  {
    term: 'address lookup table (ALT)',
    definition: 'mecanismo para referenciar muchas addresses de forma compacta en transacciones.',
    category: 'Transacciones y fees',
  },
  {
    term: 'versioned transaction',
    definition: 'formato moderno de transacciones que soporta características como Address Lookup Tables.',
    category: 'Transacciones y fees',
  },
  {
    term: 'legacy transaction',
    definition: 'formato clásico de transacción Solana anterior a versioned transactions.',
    category: 'Transacciones y fees',
  },
  {
    term: 'transaction size limit',
    definition: 'límite del tamaño serializado de una transacción; obliga a diseñar cuidadosamente cuántas accounts/instructions incluís.',
    category: 'Transacciones y fees',
  },
  {
    term: 'account locking',
    definition: 'mecanismo por el cual Solana bloquea temporalmente accounts para evitar escrituras concurrentes conflictivas.',
    category: 'Cuentas y programas',
  },
  {
    term: 'parallel execution',
    definition: 'capacidad de ejecutar transacciones simultáneamente cuando no compiten por las mismas accounts escribibles.',
    category: 'Cuentas y programas',
  },
  {
    term: 'Sealevel',
    definition: 'runtime/modelo de ejecución paralelo de Solana.',
    category: 'Cuentas y programas',
  },
  {
    term: 'hot account',
    definition: 'account muy utilizada que puede convertirse en cuello de botella porque muchas transacciones intentan escribirla.',
    category: 'Cuentas y programas',
  },
  {
    term: 'contention',
    definition: 'competencia entre transacciones por modificar las mismas accounts.',
    category: 'Cuentas y programas',
  },
  {
    term: 'state sharding',
    definition: 'repartir estado entre distintas accounts para reducir contención y mejorar paralelismo.',
    category: 'Cuentas y programas',
  },
  {
    term: 'idempotency',
    definition: 'propiedad de una operación que puede repetirse sin cambiar el resultado más allá de la primera ejecución.',
    category: 'Transacciones y fees',
  },
  {
    term: 'replay protection',
    definition: 'mecanismos que impiden reutilizar una transacción antigua como si fuera nueva.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'durable nonce',
    definition: 'mecanismo especial para crear transacciones que puedan seguir siendo válidas más tiempo que un recent blockhash normal.',
    category: 'Transacciones y fees',
  },
  {
    term: 'nonce account',
    definition: 'account usada para gestionar durable nonces en Solana.',
    category: 'Transacciones y fees',
  },
  {
    term: 'blockhash expiration',
    definition: 'momento en el que un blockhash deja de ser válido para nuevas transacciones.',
    category: 'Transacciones y fees',
  },
  {
    term: 'transaction expiration',
    definition: 'cuando una transacción ya no puede procesarse porque su blockhash quedó demasiado viejo.',
    category: 'Transacciones y fees',
  },
  {
    term: 'leader forwarding',
    definition: 'envío de transacciones hacia validators que serán líderes próximamente.',
    category: 'Transacciones y fees',
  },
  {
    term: 'mempool',
    definition: 'cola de transacciones pendientes en muchas blockchains; Solana no funciona exactamente como el mempool global clásico de Ethereum.',
    category: 'Transacciones y fees',
  },
  {
    term: 'bundles',
    definition: 'grupos ordenados de transacciones enviados juntos en infra especializada, por ejemplo sistemas MEV.',
    category: 'Transacciones y fees',
  },
  {
    term: 'Jito',
    definition: 'infraestructura del ecosistema Solana muy asociada a block building, bundles y MEV.',
    category: 'Transacciones y fees',
  },
  {
    term: 'tip',
    definition: 'pago adicional usado en ciertos flujos, por ejemplo bundles de infraestructura MEV.',
    category: 'Transacciones y fees',
  },
  {
    term: 'MEV searcher',
    definition: 'actor/software que busca oportunidades económicas derivadas del orden de transacciones.',
    category: 'DeFi y trading',
  },
  {
    term: 'arbitrage',
    definition: 'aprovechar diferencias de precio del mismo activo entre mercados.',
    category: 'DeFi y trading',
  },
  {
    term: 'liquidity routing',
    definition: 'elegir entre varios mercados para conseguir mejor precio y profundidad.',
    category: 'DeFi y trading',
  },
  {
    term: 'price feed',
    definition: 'flujo actualizado de precios utilizado por bots, protocolos u oracles.',
    category: 'DeFi y trading',
  },
  {
    term: 'on-chain data',
    definition: 'información que proviene directamente del estado/historial blockchain.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'off-chain data',
    definition: 'información externa como noticias, precios de exchanges centralizados o señales de IA.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'event',
    definition: 'dato emitido por un programa para facilitar seguimiento/indexación de lo ocurrido.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'log parser',
    definition: 'software que interpreta logs de transacciones para extraer eventos útiles.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'indexing',
    definition: 'proceso de transformar datos crudos de blockchain en estructuras fáciles de consultar.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'webhook',
    definition: 'llamada HTTP automática enviada cuando ocurre un evento observado.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'streaming',
    definition: 'recepción continua de nuevos eventos/datos en vez de consultar periódicamente.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'polling',
    definition: 'consultar repetidamente un endpoint para ver si cambió algo.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'rate limit',
    definition: 'límite de requests impuesto por un RPC o API.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'RPC provider',
    definition: 'empresa/servicio que opera nodos RPC optimizados para aplicaciones.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'Helius',
    definition: 'proveedor popular de infraestructura/RPC/indexación para Solana.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'QuickNode',
    definition: 'proveedor de infraestructura blockchain y RPC.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'Triton',
    definition: 'proveedor/infraestructura avanzada del ecosistema Solana.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'geyser',
    definition: 'sistema/plugin para transmitir cambios internos de validators a servicios externos en tiempo real.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'Yellowstone gRPC',
    definition: 'tecnología popular para consumir streams de datos Solana de muy baja latencia.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'block subscription',
    definition: 'suscripción para recibir nuevos bloques/slots o actividad relacionada.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'account subscription',
    definition: 'suscripción que avisa cuando cambia una account específica.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'program subscription',
    definition: 'suscripción para observar cambios en accounts pertenecientes a un program.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'logs subscription',
    definition: 'suscripción a logs de ejecución de transacciones/programas.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'signature subscription',
    definition: 'seguimiento de cuándo una transaction signature alcanza cierto estado.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'token balance',
    definition: 'cantidad de un token registrada en una token account.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'native balance',
    definition: 'cantidad de SOL expresada normalmente en lamports.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'wallet balance',
    definition: 'suma/representación de los assets asociados a las accounts controladas por una wallet.',
    category: 'DeFi y trading',
  },
  {
    term: 'portfolio',
    definition: 'conjunto de activos y posiciones que controla una wallet.',
    category: 'DeFi y trading',
  },
  {
    term: 'position',
    definition: 'exposición financiera concreta, por ejemplo una compra, préstamo o perpetual abierto.',
    category: 'DeFi y trading',
  },
  {
    term: 'PnL',
    definition: 'profit and loss; ganancia o pérdida de una posición.',
    category: 'DeFi y trading',
  },
  {
    term: 'realized PnL',
    definition: 'ganancia/pérdida ya concretada al cerrar una operación.',
    category: 'DeFi y trading',
  },
  {
    term: 'unrealized PnL',
    definition: 'ganancia/pérdida teórica mientras la posición sigue abierta.',
    category: 'DeFi y trading',
  },
  {
    term: 'entry price',
    definition: 'precio promedio al que abriste una posición.',
    category: 'DeFi y trading',
  },
  {
    term: 'exit price',
    definition: 'precio al que cerraste la posición.',
    category: 'DeFi y trading',
  },
  {
    term: 'stop loss',
    definition: 'orden/regla para limitar pérdida cerrando una posición al alcanzar cierto nivel.',
    category: 'DeFi y trading',
  },
  {
    term: 'take profit',
    definition: 'regla para cerrar una posición y asegurar ganancia en un nivel determinado.',
    category: 'DeFi y trading',
  },
  {
    term: 'risk engine',
    definition: 'componente que decide límites, exposición, collateral y condiciones antes de autorizar operaciones.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'execution engine',
    definition: 'componente que transforma una decisión en transacciones concretas.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'strategy engine',
    definition: 'componente que genera señales o decisiones según reglas/algoritmos.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'paper trading',
    definition: 'simulación de operaciones sin usar dinero real.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'backtesting',
    definition: 'probar una estrategia contra datos históricos para estimar cómo habría rendido.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'forward testing',
    definition: 'probar una estrategia en datos de mercado actuales sin necesariamente usar capital real.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'slippage tolerance',
    definition: 'máximo desvío de precio que aceptás antes de cancelar un swap.',
    category: 'DeFi y trading',
  },
  {
    term: 'quote expiration',
    definition: 'momento en que una estimación de swap deja de considerarse válida.',
    category: 'DeFi y trading',
  },
  {
    term: 'transaction builder',
    definition: 'componente que arma instrucciones, cuentas, blockhash y demás campos de una transacción.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'signing service',
    definition: 'componente responsable de firmar transacciones con controles de seguridad.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'policy engine',
    definition: 'capa que decide qué operaciones están permitidas antes de firmarlas.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'allowlist',
    definition: 'lista explícita de tokens, programs o acciones permitidas.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'denylist',
    definition: 'lista explícita de cosas prohibidas.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'spending limit',
    definition: 'máximo de fondos que un bot o agente puede utilizar.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'session key',
    definition: 'clave temporal con permisos limitados para evitar exponer una clave principal.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'delegated authority',
    definition: 'permisos limitados otorgados a otra clave/programa para actuar sin entregar control total.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'audit trail',
    definition: 'historial verificable de decisiones y operaciones realizadas por un sistema.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'deterministic verification',
    definition: 'capacidad de verificar una respuesta con reglas reproducibles aunque producirla haya sido caro.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'proof-of-computation',
    definition: 'prueba de que cierto trabajo computacional fue realizado, según el protocolo diseñado.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'challenge',
    definition: 'problema que un nodo debe resolver para demostrar trabajo o cumplir una condición.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'solution',
    definition: 'respuesta candidata a un challenge.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'verification',
    definition: 'proceso de comprobar que una solución cumple las reglas.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'difficulty adjustment',
    definition: 'mecanismo que modifica dificultad para mantener tiempos o costos esperados estables.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'expected hashes',
    definition: 'cantidad promedio de hashes que estadísticamente hacen falta para conseguir un resultado válido.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'success probability',
    definition: 'probabilidad de que un intento individual cumpla el target.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'brute force',
    definition: 'probar muchas combinaciones hasta encontrar una que satisfaga una condición.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'entropy',
    definition: 'medida de impredecibilidad/aleatoriedad de un valor.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'randomness',
    definition: 'datos impredecibles usados cuando un protocolo necesita selección o resultados no manipulables fácilmente.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'VRF',
    definition: 'Verifiable Random Function; produce aleatoriedad que puede verificarse criptográficamente.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'commit-reveal',
    definition: 'protocolo donde primero comprometés un secreto mediante hash y después lo revelás, evitando ciertos tipos de manipulación.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'commitment (criptográfico)',
    definition: 'hash u otra prueba que fija un valor sin revelarlo todavía.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'reveal',
    definition: 'fase donde publicás el dato original para comprobar que coincide con el commitment.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'Sybil attack',
    definition: 'ataque donde una persona crea muchas identidades para ganar influencia injustamente.',
    category: 'Seguridad y custodia',
  },
  {
    term: '51% attack',
    definition: 'escenario donde un actor controla suficiente poder de consenso para manipular ciertas propiedades de una red.',
    category: 'Consenso y red',
  },
  {
    term: 'Byzantine fault',
    definition: 'nodo que se comporta de manera arbitraria o maliciosa dentro de un sistema distribuido.',
    category: 'Consenso y red',
  },
  {
    term: 'BFT',
    definition: 'Byzantine Fault Tolerance; capacidad de un protocolo para seguir funcionando aunque algunos nodos fallen o sean maliciosos.',
    category: 'Consenso y red',
  },
  {
    term: 'decentralization',
    definition: 'distribución de control entre múltiples actores en vez de una autoridad única.',
    category: 'Consenso y red',
  },
  {
    term: 'permissionless',
    definition: 'cualquiera puede participar sin necesitar aprobación central, sujeto a las reglas del protocolo.',
    category: 'Consenso y red',
  },
  {
    term: 'permissioned',
    definition: 'participación restringida a entidades autorizadas.',
    category: 'Consenso y red',
  },
  {
    term: 'trustless',
    definition: 'sistema diseñado para minimizar la necesidad de confiar en personas concretas; confiás en reglas, criptografía y consenso.',
    category: 'Consenso y red',
  },
  {
    term: 'self-custody',
    definition: 'vos controlás directamente tus private keys y, por lo tanto, tus activos.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'custody',
    definition: 'un tercero controla las claves y mantiene activos en tu nombre.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'CEX',
    definition: 'exchange centralizado como Coinbase o Binance.',
    category: 'DeFi y trading',
  },
  {
    term: 'DEX aggregator',
    definition: 'sistema que compara/rutea operaciones entre varios DEX para encontrar mejor ejecución.',
    category: 'DeFi y trading',
  },
  {
    term: 'market maker',
    definition: 'actor que ofrece liquidez colocando o manteniendo precios de compra/venta.',
    category: 'DeFi y trading',
  },
  {
    term: 'order book',
    definition: 'lista de órdenes de compra y venta pendientes.',
    category: 'DeFi y trading',
  },
  {
    term: 'bid',
    definition: 'precio/oferta de compra.',
    category: 'DeFi y trading',
  },
  {
    term: 'ask',
    definition: 'precio/oferta de venta.',
    category: 'DeFi y trading',
  },
  {
    term: 'spread',
    definition: 'diferencia entre mejor bid y mejor ask.',
    category: 'DeFi y trading',
  },
  {
    term: 'limit order',
    definition: 'orden que solo se ejecuta a cierto precio o mejor.',
    category: 'DeFi y trading',
  },
  {
    term: 'market order',
    definition: 'orden que prioriza ejecutar inmediatamente al mejor precio disponible.',
    category: 'DeFi y trading',
  },
  {
    term: 'liquidity provider',
    definition: 'usuario/protocolo que aporta activos a un mercado o pool.',
    category: 'DeFi y trading',
  },
  {
    term: 'impermanent loss',
    definition: 'pérdida relativa posible al aportar liquidez a un AMM frente a simplemente mantener los tokens.',
    category: 'DeFi y trading',
  },
  {
    term: 'yield',
    definition: 'rendimiento obtenido por prestar, stakear o aportar liquidez.',
    category: 'DeFi y trading',
  },
  {
    term: 'APY',
    definition: 'rendimiento anual estimado incluyendo capitalización.',
    category: 'DeFi y trading',
  },
  {
    term: 'APR',
    definition: 'tasa anual generalmente expresada sin capitalización compuesta.',
    category: 'DeFi y trading',
  },
  {
    term: 'staking yield',
    definition: 'recompensas obtenidas por delegar/stakear SOL.',
    category: 'Economía y governance',
  },
  {
    term: 'liquid staking token',
    definition: 'token que representa SOL stakeado y permite seguir usándolo en DeFi.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'LST',
    definition: 'abreviatura de Liquid Staking Token.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'validator commission',
    definition: 'porcentaje que cobra un validator sobre recompensas de staking.',
    category: 'Economía y governance',
  },
  {
    term: 'unstake',
    definition: 'retirar/deactivar stake para recuperar disponibilidad del SOL.',
    category: 'Consenso y red',
  },
  {
    term: 'activation/deactivation',
    definition: 'períodos necesarios para que stake entre o salga plenamente del conjunto activo.',
    category: 'Consenso y red',
  },
  {
    term: 'protocol fee',
    definition: 'comisión que un protocolo cobra por usar sus servicios.',
    category: 'Economía y governance',
  },
  {
    term: 'network fee',
    definition: 'costo pagado a la red por procesar transacciones.',
    category: 'Transacciones y fees',
  },
  {
    term: 'gas',
    definition: 'término típico de Ethereum para costo computacional; en Solana se habla más de fees y compute units.',
    category: 'Transacciones y fees',
  },
  {
    term: 'gasless transaction',
    definition: 'experiencia donde otro actor paga ciertos costos de red en nombre del usuario.',
    category: 'Transacciones y fees',
  },
  {
    term: 'relayer',
    definition: 'servicio que recibe operaciones firmadas y las envía a la blockchain, a veces pagando fees.',
    category: 'Transacciones y fees',
  },
  {
    term: 'meta-transaction',
    definition: 'patrón donde el usuario firma intención y otro actor construye/envía la transacción final.',
    category: 'Transacciones y fees',
  },
  {
    term: 'intent',
    definition: 'descripción de lo que el usuario quiere conseguir sin especificar necesariamente cada paso de ejecución.',
    category: 'DeFi y trading',
  },
  {
    term: 'solver',
    definition: 'agente que busca la mejor manera de cumplir un intent.',
    category: 'DeFi y trading',
  },
  {
    term: 'settlement',
    definition: 'fase final en la que resultados económicos quedan registrados/ejecutados.',
    category: 'DeFi y trading',
  },
  {
    term: 'settlement layer',
    definition: 'blockchain o sistema que registra el resultado definitivo de operaciones.',
    category: 'Consenso y red',
  },
  {
    term: 'execution layer',
    definition: 'capa donde se ejecuta la lógica/transacciones.',
    category: 'Consenso y red',
  },
  {
    term: 'data availability',
    definition: 'garantía de que los datos necesarios para verificar el estado están disponibles.',
    category: 'Consenso y red',
  },
  {
    term: 'state transition',
    definition: 'cambio de un estado válido a otro producido por una transacción.',
    category: 'Cuentas y programas',
  },
  {
    term: 'state machine',
    definition: 'modelo donde reglas deterministas definen qué transiciones de estado están permitidas.',
    category: 'Cuentas y programas',
  },
  {
    term: 'distributed system',
    definition: 'sistema ejecutado por múltiples máquinas que coordinan sin compartir memoria central.',
    category: 'Consenso y red',
  },
  {
    term: 'fault tolerance',
    definition: 'capacidad de seguir funcionando pese a fallos de componentes.',
    category: 'Consenso y red',
  },
  {
    term: 'replication',
    definition: 'mantener copias de datos/estado en múltiples nodos.',
    category: 'Consenso y red',
  },
  {
    term: 'consistency',
    definition: 'grado en el que distintos nodos coinciden sobre el mismo estado.',
    category: 'Consenso y red',
  },
  {
    term: 'availability',
    definition: 'capacidad de un sistema de seguir respondiendo a solicitudes.',
    category: 'Consenso y red',
  },
  {
    term: 'CAP theorem',
    definition: 'principio de sistemas distribuidos sobre trade-offs entre consistencia, disponibilidad y particiones de red.',
    category: 'Consenso y red',
  },
  {
    term: 'network partition',
    definition: 'situación donde grupos de nodos dejan temporalmente de poder comunicarse entre sí.',
    category: 'Consenso y red',
  },
  {
    term: 'fork choice',
    definition: 'regla que decide qué rama de una blockchain debe considerarse la principal.',
    category: 'Consenso y red',
  },
  {
    term: 'canonical chain',
    definition: 'historia actualmente considerada válida/oficial por consenso.',
    category: 'Consenso y red',
  },
  {
    term: 'genesis',
    definition: 'configuración inicial desde la que arranca una red.',
    category: 'Consenso y red',
  },
  {
    term: 'protocol upgrade',
    definition: 'cambio coordinado en las reglas de una blockchain.',
    category: 'Consenso y red',
  },
  {
    term: 'hard fork',
    definition: 'cambio incompatible que puede separar una blockchain si no todos actualizan.',
    category: 'Consenso y red',
  },
  {
    term: 'soft fork',
    definition: 'cambio de reglas compatible en determinadas condiciones, concepto más común en Bitcoin.',
    category: 'Consenso y red',
  },
  {
    term: 'client implementation',
    definition: 'software concreto que implementa las reglas de un protocolo.',
    category: 'Consenso y red',
  },
  {
    term: 'validator client',
    definition: 'software usado por validators para participar en la red.',
    category: 'Consenso y red',
  },
  {
    term: 'Agave',
    definition: 'implementación/cliente principal del ecosistema Solana derivado del antiguo cliente Solana Labs.',
    category: 'Consenso y red',
  },
  {
    term: 'Firedancer',
    definition: 'cliente validator de alto rendimiento desarrollado para Solana por Jump.',
    category: 'Consenso y red',
  },
  {
    term: 'Frankendancer',
    definition: 'integración parcial/progresiva de componentes Firedancer con infraestructura existente.',
    category: 'Consenso y red',
  },
  {
    term: 'runtime',
    definition: 'componente que ejecuta programas y aplica reglas de transición de estado.',
    category: 'Cuentas y programas',
  },
  {
    term: 'scheduler',
    definition: 'componente que decide cómo ordenar/ejecutar trabajo respetando dependencias y locks.',
    category: 'Transacciones y fees',
  },
  {
    term: 'parallelism',
    definition: 'ejecución simultánea de tareas independientes.',
    category: 'Cuentas y programas',
  },
  {
    term: 'deterministic execution',
    definition: 'todos los validators deben obtener el mismo resultado al ejecutar la misma transacción válida.',
    category: 'Cuentas y programas',
  },
  {
    term: 'serialization conflict',
    definition: 'conflicto cuando dos operaciones quieren modificar el mismo estado simultáneamente.',
    category: 'Cuentas y programas',
  },
  {
    term: 'account model',
    definition: 'arquitectura de Solana basada en accounts explícitas pasadas a las instrucciones.',
    category: 'Cuentas y programas',
  },
  {
    term: 'UTXO',
    definition: 'modelo de Bitcoin basado en salidas de transacciones no gastadas.',
    category: 'Cuentas y programas',
  },
  {
    term: 'EVM',
    definition: 'Ethereum Virtual Machine; runtime usado por Ethereum y redes compatibles.',
    category: 'Cuentas y programas',
  },
  {
    term: 'SVM',
    definition: 'Solana Virtual Machine; término usado para el entorno/modelo de ejecución de Solana.',
    category: 'Cuentas y programas',
  },
  {
    term: 'bytecode',
    definition: 'representación compilada del programa que puede ejecutar una máquina virtual/runtime.',
    category: 'Rust y Anchor',
  },
  {
    term: 'compiler',
    definition: 'herramienta que transforma código fuente, como Rust, a un formato ejecutable.',
    category: 'Rust y Anchor',
  },
  {
    term: 'ABI',
    definition: 'especificación de cómo interactuar con funciones/datos binarios; Anchor usa IDL como capa de interfaz amigable.',
    category: 'Cuentas y programas',
  },
  {
    term: 'program interface',
    definition: 'conjunto de instrucciones y accounts que expone un programa para ser utilizado por clientes.',
    category: 'Cuentas y programas',
  },
  {
    term: 'composability',
    definition: 'capacidad de combinar protocolos/programas entre sí para construir funciones nuevas.',
    category: 'DeFi y trading',
  },
  {
    term: 'permissionless composability',
    definition: 'posibilidad de integrar programas sin pedir permiso al autor original, siguiendo sus interfaces públicas.',
    category: 'DeFi y trading',
  },
  {
    term: 'protocol primitive',
    definition: 'componente básico reutilizable como token, lending, swap u oracle.',
    category: 'DeFi y trading',
  },
  {
    term: 'money lego',
    definition: 'forma informal de llamar a la composabilidad de protocolos DeFi.',
    category: 'DeFi y trading',
  },
  {
    term: 'settlement risk',
    definition: 'riesgo de que una operación no termine liquidándose como se esperaba.',
    category: 'DeFi y trading',
  },
  {
    term: 'counterparty risk',
    definition: 'riesgo de que la otra parte de una operación no cumpla; blockchain intenta reducirlo mediante reglas automáticas en algunos contextos.',
    category: 'DeFi y trading',
  },
  {
    term: 'smart contract risk',
    definition: 'riesgo de pérdida debido a bugs o lógica inesperada en programas on-chain.',
    category: 'DeFi y trading',
  },
  {
    term: 'oracle risk',
    definition: 'riesgo de que datos externos incorrectos provoquen decisiones financieras erróneas.',
    category: 'DeFi y trading',
  },
  {
    term: 'liquidity risk',
    definition: 'riesgo de no poder salir de una posición al precio esperado.',
    category: 'DeFi y trading',
  },
  {
    term: 'key management',
    definition: 'disciplina de almacenar, rotar y proteger claves criptográficas.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'key rotation',
    definition: 'reemplazar una clave por otra de forma controlada.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'secret management',
    definition: 'almacenamiento seguro de private keys, API keys y otros secretos.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'HSM',
    definition: 'hardware especializado para generar/proteger claves y realizar firmas sin exponerlas.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'MPC',
    definition: 'Multi-Party Computation; técnica para controlar claves/firmas distribuyendo secretos entre varias partes.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'threshold signature',
    definition: 'firma válida que requiere cooperación de un mínimo de participantes.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'social recovery',
    definition: 'mecanismo para recuperar control mediante personas/dispositivos de confianza sin una seed tradicional única.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'account abstraction',
    definition: 'enfoque donde wallets pueden tener lógica programable más avanzada que una simple keypair; el concepto es más común en Ethereum, pero hay patrones equivalentes en otros ecosistemas.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'session wallet',
    definition: 'wallet o clave temporal diseñada para interacciones frecuentes con permisos limitados.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'transaction intent',
    definition: 'intención firmada que luego puede transformarse en una ejecución concreta por otro componente.',
    category: 'DeFi y trading',
  },
  {
    term: 'simulation result',
    definition: 'salida de ejecutar una transacción virtualmente antes de enviarla.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'program error',
    definition: 'código/error emitido cuando un programa rechaza una instrucción.',
    category: 'Rust y Anchor',
  },
  {
    term: 'custom error',
    definition: 'error definido por tu propio programa para explicar por qué una operación fue rechazada.',
    category: 'Rust y Anchor',
  },
  {
    term: 'panic',
    definition: 'fallo abrupto del código que hace fallar la instrucción/transacción.',
    category: 'Rust y Anchor',
  },
  {
    term: 'require!',
    definition: 'macro común de Anchor para validar una condición y devolver error si no se cumple.',
    category: 'Rust y Anchor',
  },
  {
    term: 'constraint',
    definition: 'validación declarativa de Anchor aplicada a una account.',
    category: 'Rust y Anchor',
  },
  {
    term: 'has_one',
    definition: 'constraint de Anchor que verifica que una account referencia correctamente otra public key.',
    category: 'Rust y Anchor',
  },
  {
    term: 'init',
    definition: 'constraint de Anchor que crea/inicializa una account.',
    category: 'Rust y Anchor',
  },
  {
    term: 'init_if_needed',
    definition: 'crea una account solo si todavía no existe, y debe usarse cuidadosamente.',
    category: 'Rust y Anchor',
  },
  {
    term: 'mut',
    definition: 'indica que una account debe ser writable porque será modificada.',
    category: 'Rust y Anchor',
  },
  {
    term: 'Signer<\'info>',
    definition: 'tipo Anchor que exige que cierta account haya firmado la transacción.',
    category: 'Rust y Anchor',
  },
  {
    term: 'Account<\'info, T>',
    definition: 'tipo Anchor para una account deserializada y validada como estructura T.',
    category: 'Rust y Anchor',
  },
  {
    term: 'Program<\'info, T>',
    definition: 'referencia validada a un program conocido.',
    category: 'Rust y Anchor',
  },
  {
    term: 'System<\'info>',
    definition: 'referencia al System Program dentro de Anchor.',
    category: 'Rust y Anchor',
  },
  {
    term: 'Context<T>',
    definition: 'estructura Anchor que agrupa las accounts y contexto de una instruction.',
    category: 'Rust y Anchor',
  },
  {
    term: 'instruction data',
    definition: 'bytes que especifican parámetros concretos de una llamada a program.',
    category: 'Cuentas y programas',
  },
  {
    term: 'account data',
    definition: 'bytes persistentes almacenados dentro de una account.',
    category: 'Cuentas y programas',
  },
  {
    term: 'space',
    definition: 'cantidad de bytes reservados para los datos de una account.',
    category: 'Rust y Anchor',
  },
  {
    term: 'realloc',
    definition: 'cambiar el espacio reservado de una account bajo ciertas reglas.',
    category: 'Rust y Anchor',
  },
  {
    term: 'discriminator',
    definition: 'bytes iniciales usados por Anchor para identificar tipos e instrucciones.',
    category: 'Rust y Anchor',
  },
  {
    term: 'zero-copy',
    definition: 'técnica para leer/escribir estructuras minimizando copias y costos, usada en casos avanzados.',
    category: 'Rust y Anchor',
  },
  {
    term: 'account compression',
    definition: 'técnica para representar grandes cantidades de estado usando estructuras compactas y pruebas criptográficas.',
    category: 'Cuentas y programas',
  },
  {
    term: 'Merkle proof',
    definition: 'prueba pequeña que demuestra que un dato pertenece a un Merkle tree sin mostrar todo el árbol.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'state compression',
    definition: 'guardar un compromiso/hash on-chain y mantener gran parte del estado fuera o comprimido.',
    category: 'Cuentas y programas',
  },
  {
    term: 'proof verification',
    definition: 'comprobar matemáticamente una prueba sin repetir todo el trabajo que la produjo.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'ZK proof',
    definition: 'prueba criptográfica que demuestra una afirmación sin revelar necesariamente toda la información subyacente.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'zero knowledge',
    definition: 'propiedad de demostrar algo sin revelar datos adicionales más allá de que la afirmación es cierta.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'rollup',
    definition: 'arquitectura que ejecuta muchas operaciones fuera de una L1 y publica pruebas/datos resumidos; más común en ecosistema Ethereum.',
    category: 'Conceptos generales',
  },
  {
    term: 'sidechain',
    definition: 'blockchain separada conectada a otra mediante bridges u otros mecanismos.',
    category: 'Conceptos generales',
  },
  {
    term: 'appchain',
    definition: 'blockchain construida específicamente para una aplicación o protocolo.',
    category: 'Conceptos generales',
  },
  {
    term: 'shared state',
    definition: 'estado accesible/compartido entre distintas aplicaciones dentro de una misma blockchain.',
    category: 'Cuentas y programas',
  },
  {
    term: 'interoperability',
    definition: 'capacidad de diferentes chains/protocolos para comunicarse o mover valor.',
    category: 'Conceptos generales',
  },
  {
    term: 'cross-chain',
    definition: 'operación que involucra más de una blockchain.',
    category: 'Conceptos generales',
  },
  {
    term: 'canonical bridge',
    definition: 'bridge considerado oficial o principal entre determinadas redes.',
    category: 'Conceptos generales',
  },
  {
    term: 'bridge exploit',
    definition: 'ataque a un bridge; históricamente han sido objetivos de muy alto riesgo.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'wrapped SOL',
    definition: 'representación de SOL bajo el estándar de token para poder usarlo como SPL token (wSOL).',
    category: 'Tokens y NFTs',
  },
  {
    term: 'unwrap',
    definition: 'convertir una representación wrapped de vuelta al activo nativo cuando el sistema lo permite.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'token extension',
    definition: 'funcionalidad adicional incorporada a tokens, especialmente en Token-2022.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'transfer hook',
    definition: 'extensión que permite ejecutar lógica adicional cuando se transfiere un token.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'transfer fee',
    definition: 'comisión programable aplicada al mover ciertos tokens.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'confidential transfer',
    definition: 'extensión orientada a ocultar determinados montos/datos mediante criptografía avanzada.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'freeze',
    definition: 'impedir temporalmente que una token account transfiera tokens.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'thaw',
    definition: 'volver a habilitar una token account previamente congelada.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'burn authority',
    definition: 'autoridad/lógica permitida para destruir unidades de un token en determinados diseños.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'metadata program',
    definition: 'programa que almacena información descriptiva de tokens/NFTs.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'Metaplex',
    definition: 'ecosistema/protocolos muy usados para NFTs y metadata en Solana.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'collection',
    definition: 'agrupación lógica/verificada de NFTs.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'royalty',
    definition: 'porcentaje previsto para creadores en determinadas ventas, cuya aplicabilidad depende del marketplace/protocolo.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'compressed asset',
    definition: 'activo representado mediante estructuras comprimidas en vez de una account tradicional por cada elemento.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'DePIN',
    definition: 'infraestructura física descentralizada coordinada/incentivada mediante blockchain.',
    category: 'Conceptos generales',
  },
  {
    term: 'RWA',
    definition: 'Real World Asset; representación blockchain de activos del mundo real.',
    category: 'Conceptos generales',
  },
  {
    term: 'prediction market',
    definition: 'mercado donde se negocian probabilidades de eventos futuros.',
    category: 'DeFi y trading',
  },
  {
    term: 'launchpad',
    definition: 'plataforma para lanzar y distribuir nuevos tokens/proyectos.',
    category: 'Economía y governance',
  },
  {
    term: 'bonding curve',
    definition: 'fórmula que determina precio de un token según supply/demanda dentro de un mecanismo automático.',
    category: 'Economía y governance',
  },
  {
    term: 'pump.fun',
    definition: 'plataforma de lanzamiento de tokens en Solana basada en mecanismos de bonding curve y mercados posteriores.',
    category: 'Economía y governance',
  },
  {
    term: 'memecoin',
    definition: 'token cuyo valor depende principalmente de comunidad, narrativa y especulación más que de utilidad fundamental.',
    category: 'Economía y governance',
  },
  {
    term: 'market cap',
    definition: 'precio del token multiplicado por supply circulante, aproximadamente.',
    category: 'DeFi y trading',
  },
  {
    term: 'FDV',
    definition: 'Fully Diluted Valuation; precio multiplicado por el supply máximo/total previsto.',
    category: 'Economía y governance',
  },
  {
    term: 'circulating supply',
    definition: 'tokens actualmente disponibles/circulando en el mercado.',
    category: 'Economía y governance',
  },
  {
    term: 'vesting',
    definition: 'liberación programada de tokens a lo largo del tiempo.',
    category: 'Economía y governance',
  },
  {
    term: 'cliff',
    definition: 'período inicial durante el cual no se liberan tokens en un esquema de vesting.',
    category: 'Economía y governance',
  },
  {
    term: 'unlock',
    definition: 'momento en el que tokens previamente bloqueados pasan a estar disponibles.',
    category: 'Economía y governance',
  },
  {
    term: 'treasury',
    definition: 'fondos controlados por un protocolo, DAO o empresa.',
    category: 'Economía y governance',
  },
  {
    term: 'token allocation',
    definition: 'reparto inicial de supply entre equipo, inversores, comunidad, treasury, etc.',
    category: 'Economía y governance',
  },
  {
    term: 'token emission',
    definition: 'ritmo con el que se crean/liberan nuevos tokens.',
    category: 'Economía y governance',
  },
  {
    term: 'deflationary',
    definition: 'diseño donde el supply puede disminuir con el tiempo.',
    category: 'Economía y governance',
  },
  {
    term: 'inflationary',
    definition: 'diseño donde el supply aumenta con emisiones nuevas.',
    category: 'Economía y governance',
  },
  {
    term: 'governance token',
    definition: 'token usado para participar en decisiones de un protocolo.',
    category: 'Economía y governance',
  },
  {
    term: 'proposal',
    definition: 'cambio o decisión sometida a votación de governance.',
    category: 'Economía y governance',
  },
  {
    term: 'quorum',
    definition: 'participación mínima necesaria para que una votación sea válida.',
    category: 'Economía y governance',
  },
  {
    term: 'delegated voting',
    definition: 'delegar poder de voto a otra dirección.',
    category: 'Economía y governance',
  },
  {
    term: 'snapshot',
    definition: 'estado tomado en un momento concreto para determinar balances o derechos de voto.',
    category: 'Economía y governance',
  },
  {
    term: 'airdrop eligibility',
    definition: 'reglas que determinan qué wallets reciben una distribución.',
    category: 'Economía y governance',
  },
  {
    term: 'sybil filtering',
    definition: 'técnicas para detectar personas que usan muchas wallets para abusar de recompensas.',
    category: 'Economía y governance',
  },
  {
    term: 'points program',
    definition: 'sistema off-chain/on-chain que asigna puntos para incentivar actividad y potenciales recompensas.',
    category: 'Economía y governance',
  },
  {
    term: 'testnet',
    definition: 'red de prueba orientada normalmente a validación del protocolo/validators; no siempre es el mejor entorno de desarrollo de apps.',
    category: 'Consenso y red',
  },
  {
    term: 'faucet SOL',
    definition: 'SOL sin valor económico entregado en redes de prueba.',
    category: 'Economía y governance',
  },
  {
    term: 'mainnet-beta',
    definition: 'nombre histórico/usado para la red principal de Solana.',
    category: 'Consenso y red',
  },
  {
    term: 'genesis configuration',
    definition: 'parámetros iniciales definidos cuando se crea un cluster.',
    category: 'Consenso y red',
  },
  {
    term: 'validator identity',
    definition: 'keypair que identifica a un validator.',
    category: 'Consenso y red',
  },
  {
    term: 'vote authority',
    definition: 'clave autorizada a firmar votos de un validator.',
    category: 'Consenso y red',
  },
  {
    term: 'withdraw authority',
    definition: 'clave con control sobre retiros de una vote account.',
    category: 'Consenso y red',
  },
  {
    term: 'delinquent validator',
    definition: 'validator que dejó de votar correctamente durante cierto período.',
    category: 'Consenso y red',
  },
  {
    term: 'skip rate',
    definition: 'proporción de slots donde un validator líder no produjo correctamente un bloque esperado.',
    category: 'Consenso y red',
  },
  {
    term: 'stake concentration',
    definition: 'cuánto stake está concentrado en pocos validators.',
    category: 'Consenso y red',
  },
  {
    term: 'Nakamoto coefficient',
    definition: 'métrica aproximada de cuántas entidades serían necesarias para comprometer ciertos umbrales de una red.',
    category: 'Consenso y red',
  },
  {
    term: 'liveness',
    definition: 'capacidad del protocolo de seguir progresando y produciendo nuevos estados.',
    category: 'Consenso y red',
  },
  {
    term: 'safety',
    definition: 'propiedad de evitar que nodos honestos acepten estados incompatibles.',
    category: 'Consenso y red',
  },
  {
    term: 'fork convergence',
    definition: 'proceso por el cual validators terminan coincidiendo en una rama.',
    category: 'Consenso y red',
  },
  {
    term: 'optimistic confirmation',
    definition: 'mecanismo para dar confianza rápida antes de finality completa bajo ciertas condiciones.',
    category: 'Consenso y red',
  },
  {
    term: 'root',
    definition: 'slot considerado suficientemente finalizado como para formar parte estable del ledger local.',
    category: 'Consenso y red',
  },
  {
    term: 'bank',
    definition: 'estructura interna de Solana que representa un estado de ejecución asociado a un slot.',
    category: 'Consenso y red',
  },
  {
    term: 'bank fork',
    definition: 'árbol de estados candidatos derivados de distintos slots/forks.',
    category: 'Consenso y red',
  },
  {
    term: 'PoH tick',
    definition: 'marca criptográfica usada dentro del reloj de Proof of History.',
    category: 'Consenso y red',
  },
  {
    term: 'entry',
    definition: 'unidad del ledger que agrupa transacciones y ticks bajo el flujo de PoH.',
    category: 'Consenso y red',
  },
  {
    term: 'shred propagation',
    definition: 'distribución de fragmentos de datos entre validators.',
    category: 'Consenso y red',
  },
  {
    term: 'repair',
    definition: 'mecanismo mediante el cual un nodo solicita fragmentos del ledger que le faltan.',
    category: 'Consenso y red',
  },
  {
    term: 'snapshot archive',
    definition: 'copia del estado usada para que nodos puedan arrancar/sincronizarse más rápido.',
    category: 'Consenso y red',
  },
  {
    term: 'incremental snapshot',
    definition: 'snapshot que contiene cambios respecto de otro snapshot base.',
    category: 'Consenso y red',
  },
  {
    term: 'ledger pruning',
    definition: 'eliminación de partes antiguas del ledger local para reducir almacenamiento.',
    category: 'Consenso y red',
  },
  {
    term: 'RPC archival node',
    definition: 'nodo que conserva más historial para responder consultas antiguas.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'historical transaction',
    definition: 'transacción suficientemente vieja como para requerir un RPC con historial extendido.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'account history',
    definition: 'evolución temporal de una account, normalmente obtenida mediante indexadores o historial de transacciones.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'block explorer',
    definition: 'interfaz web que traduce datos blockchain crudos en información navegable.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'signature status',
    definition: 'estado actual de procesamiento/confirmación de una firma.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'transaction metadata',
    definition: 'información añadida tras ejecución como logs, fees, balances previos/posteriores y errores.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'pre balance',
    definition: 'balance antes de ejecutar una transacción.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'post balance',
    definition: 'balance después de ejecutar una transacción.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'inner instruction',
    definition: 'instruction generada dentro de una CPI mientras se ejecuta otra instruction.',
    category: 'Transacciones y fees',
  },
  {
    term: 'return data',
    definition: 'datos que un programa puede devolver durante ejecución para que otros componentes los consulten.',
    category: 'Cuentas y programas',
  },
  {
    term: 'program log',
    definition: 'texto emitido por un programa durante una transacción.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'compute consumption',
    definition: 'cantidad de compute units utilizadas realmente por una instrucción/transacción.',
    category: 'Transacciones y fees',
  },
  {
    term: 'heap',
    definition: 'memoria dinámica disponible durante ejecución del programa, limitada por el runtime.',
    category: 'Rust y Anchor',
  },
  {
    term: 'stack',
    definition: 'memoria usada para variables locales y llamadas durante ejecución.',
    category: 'Rust y Anchor',
  },
  {
    term: 'account borrowing',
    definition: 'reglas internas del runtime/Rust para acceso seguro a datos de accounts.',
    category: 'Rust y Anchor',
  },
  {
    term: 'unsafe Rust',
    definition: 'operaciones que evitan ciertas garantías del compilador y requieren especial cuidado.',
    category: 'Rust y Anchor',
  },
  {
    term: 'memory safety',
    definition: 'propiedad de evitar accesos inválidos a memoria; Rust ayuda mucho en esto.',
    category: 'Rust y Anchor',
  },
  {
    term: 'ownership Rust',
    definition: 'sistema de Rust que controla quién posee y puede modificar valores en memoria.',
    category: 'Rust y Anchor',
  },
  {
    term: 'borrow checker',
    definition: 'componente del compilador Rust que hace cumplir reglas de referencias y ownership.',
    category: 'Rust y Anchor',
  },
  {
    term: 'lifetime',
    definition: 'anotación/concepto de Rust que expresa cuánto tiempo una referencia es válida.',
    category: 'Rust y Anchor',
  },
  {
    term: 'trait',
    definition: 'interfaz/comportamiento reutilizable en Rust.',
    category: 'Rust y Anchor',
  },
  {
    term: 'enum',
    definition: 'tipo que puede tomar uno de varios estados/variantes definidos.',
    category: 'Rust y Anchor',
  },
  {
    term: 'Result<T,E>',
    definition: 'tipo Rust que representa éxito (Ok) o error (Err).',
    category: 'Rust y Anchor',
  },
  {
    term: 'Option<T>',
    definition: 'tipo Rust que representa un valor presente (Some) o ausente (None).',
    category: 'Rust y Anchor',
  },
  {
    term: 'macro',
    definition: 'mecanismo de Rust para generar/transformar código; Anchor usa muchas macros.',
    category: 'Rust y Anchor',
  },
  {
    term: 'derive',
    definition: 'atributo Rust que genera implementaciones automáticamente para estructuras/tipos.',
    category: 'Rust y Anchor',
  },
  {
    term: 'crate',
    definition: 'paquete/librería de Rust.',
    category: 'Rust y Anchor',
  },
  {
    term: 'Cargo',
    definition: 'gestor de dependencias y sistema de build de Rust.',
    category: 'Rust y Anchor',
  },
  {
    term: 'Cargo.toml',
    definition: 'archivo que define metadata y dependencias de un proyecto Rust.',
    category: 'Rust y Anchor',
  },
  {
    term: 'workspace',
    definition: 'conjunto de crates relacionados administrados juntos por Cargo.',
    category: 'Rust y Anchor',
  },
  {
    term: 'feature flag',
    definition: 'opción de compilación que activa/desactiva funcionalidades.',
    category: 'Rust y Anchor',
  },
  {
    term: 'build artifact',
    definition: 'archivo compilado resultante del proceso de build.',
    category: 'Rust y Anchor',
  },
  {
    term: 'deploy keypair',
    definition: 'keypair utilizada durante ciertas operaciones de deployment o authority.',
    category: 'Cuentas y programas',
  },
  {
    term: 'program buffer',
    definition: 'account temporal usada durante despliegues/actualizaciones de programas upgradeables.',
    category: 'Cuentas y programas',
  },
  {
    term: 'immutable program',
    definition: 'programa cuya upgrade authority fue eliminada y ya no puede actualizarse.',
    category: 'Cuentas y programas',
  },
  {
    term: 'upgradeable program',
    definition: 'programa que conserva una authority capaz de publicar nuevas versiones.',
    category: 'Cuentas y programas',
  },
  {
    term: 'programdata account',
    definition: 'account relacionada con datos/authority de programas upgradeables.',
    category: 'Cuentas y programas',
  },
  {
    term: 'anchor deploy',
    definition: 'comando que compila/despliega programas Anchor según configuración.',
    category: 'Rust y Anchor',
  },
  {
    term: 'anchor test',
    definition: 'comando para levantar entorno de prueba y ejecutar tests Anchor.',
    category: 'Rust y Anchor',
  },
  {
    term: 'anchor build',
    definition: 'compila el programa Anchor.',
    category: 'Rust y Anchor',
  },
  {
    term: 'anchor keys list',
    definition: 'muestra program IDs/keys relacionados con el proyecto.',
    category: 'Rust y Anchor',
  },
  {
    term: 'declare_id!',
    definition: 'macro Rust/Anchor que declara el program ID esperado.',
    category: 'Rust y Anchor',
  },
  {
    term: 'Anchor.toml',
    definition: 'configuración del workspace Anchor, clusters, programs y scripts.',
    category: 'Rust y Anchor',
  },
  {
    term: 'provider',
    definition: 'configuración/objeto usado por Anchor para definir wallet y RPC de interacción.',
    category: 'Rust y Anchor',
  },
  {
    term: 'workspace client',
    definition: 'cliente Anchor que expone programas definidos en el workspace.',
    category: 'Rust y Anchor',
  },
  {
    term: 'transaction payer',
    definition: 'account que paga los fees de una transacción.',
    category: 'Transacciones y fees',
  },
  {
    term: 'fee payer',
    definition: 'sinónimo práctico del actor que cubre los fees de red.',
    category: 'Transacciones y fees',
  },
  {
    term: 'required signature',
    definition: 'firma que debe estar presente para que una transacción sea válida.',
    category: 'Transacciones y fees',
  },
  {
    term: 'partial signing',
    definition: 'cuando distintas partes firman una misma transacción en momentos diferentes.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'offline signing',
    definition: 'firmar una transacción en un dispositivo sin conexión y enviarla después desde otro.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'serialized transaction',
    definition: 'representación binaria/base64 de una transacción lista para transportar o enviar.',
    category: 'Transacciones y fees',
  },
  {
    term: 'base64',
    definition: 'codificación frecuente para transportar bytes de transacciones a través de APIs JSON.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'transaction deserialization',
    definition: 'reconstruir el objeto transaction desde sus bytes serializados.',
    category: 'Transacciones y fees',
  },
  {
    term: 'blockhash refresh',
    definition: 'reemplazar un blockhash vencido por uno reciente antes de volver a firmar/enviar.',
    category: 'Transacciones y fees',
  },
  {
    term: 'retry',
    definition: 'volver a intentar enviar una transacción cuando no se confirma o falla por condiciones transitorias.',
    category: 'Transacciones y fees',
  },
  {
    term: 'duplicate signature',
    definition: 'mismo mensaje firmado genera firma repetida bajo ciertas condiciones, y no debe confundirse con una nueva operación.',
    category: 'Transacciones y fees',
  },
  {
    term: 'transaction deduplication',
    definition: 'mecanismo para evitar procesar la misma transacción varias veces.',
    category: 'Transacciones y fees',
  },
  {
    term: 'priority queue',
    definition: 'lógica del scheduler/RPC/validator para ordenar transacciones según fees y otros criterios.',
    category: 'Transacciones y fees',
  },
  {
    term: 'congestion',
    definition: 'situación donde hay más demanda de transacciones que capacidad inmediata disponible.',
    category: 'Transacciones y fees',
  },
  {
    term: 'fee market',
    definition: 'dinámica donde usuarios compiten pagando priority fees para conseguir inclusión más rápida.',
    category: 'Transacciones y fees',
  },
  {
    term: 'local fee market',
    definition: 'concepto de Solana donde la competencia de fees está especialmente ligada a accounts/recursos contenciosos.',
    category: 'Transacciones y fees',
  },
  {
    term: 'compute unit price',
    definition: 'precio adicional que estás dispuesto a pagar por cada compute unit para priorizar una transacción.',
    category: 'Transacciones y fees',
  },
  {
    term: 'compute unit limit',
    definition: 'máximo de CUs que permitís que consuma una transacción.',
    category: 'Transacciones y fees',
  },
  {
    term: 'transaction landing',
    definition: 'que una transacción efectivamente sea incluida/procesada por la red.',
    category: 'Transacciones y fees',
  },
  {
    term: 'drop',
    definition: 'cuando una transacción enviada no termina siendo procesada antes de expirar o por otras condiciones.',
    category: 'Transacciones y fees',
  },
  {
    term: 'rebroadcast',
    definition: 'volver a enviar una transacción a la red para aumentar chances de landing.',
    category: 'Transacciones y fees',
  },
  {
    term: 'block engine',
    definition: 'infraestructura que coordina orden/inclusión de transacciones o bundles, como en ecosistemas MEV.',
    category: 'Transacciones y fees',
  },
  {
    term: 'bundle atomicity',
    definition: 'garantía buscada de que un conjunto de transacciones se procese bajo ciertas reglas conjuntas.',
    category: 'Transacciones y fees',
  },
  {
    term: 'bundle tip',
    definition: 'incentivo económico para que un bundle sea procesado por determinada infraestructura.',
    category: 'Transacciones y fees',
  },
  {
    term: 'latency arbitrage',
    definition: 'aprovechar pequeñas diferencias temporales entre fuentes de precio/mercados.',
    category: 'DeFi y trading',
  },
  {
    term: 'low-latency RPC',
    definition: 'infraestructura optimizada para minimizar tiempo de envío/recepción de datos.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'co-location',
    definition: 'ubicar servidores cerca físicamente de infraestructura crítica para reducir latencia.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'validator proximity',
    definition: 'cercanía de red a validators/líderes que puede reducir tiempos de propagación.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'slot latency',
    definition: 'tiempo relativo a cuánto falta o tarda un slot en producir/procesar datos.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'leader awareness',
    definition: 'conocer qué validator será próximo líder para optimizar envío de transacciones.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'transaction routing',
    definition: 'estrategia para decidir a qué RPC/validator enviar una transacción.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'spam',
    definition: 'envío excesivo de transacciones/requests para intentar ganar prioridad, normalmente indeseable y costoso.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'rate limiting',
    definition: 'control que restringe la cantidad de operaciones permitidas por intervalo.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'backpressure',
    definition: 'mecanismo para reducir producción/envío cuando consumidores o red están saturados.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'queue',
    definition: 'estructura donde esperan operaciones pendientes de procesamiento.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'worker',
    definition: 'proceso/hilo que consume tareas de una queue.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'bot',
    definition: 'software que ejecuta automáticamente estrategias, monitoreo o acciones.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'trading bot',
    definition: 'bot enfocado en analizar mercados y ejecutar operaciones financieras.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'keeper',
    definition: 'bot externo que ejecuta tareas necesarias de un protocolo, como liquidaciones o actualizaciones.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'crank',
    definition: 'término histórico para operaciones externas que "empujan" el estado de un programa hacia adelante.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'permissioned keeper',
    definition: 'keeper que necesita autorización explícita.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'permissionless keeper',
    definition: 'cualquiera puede ejecutar la tarea si cumple las condiciones.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'automation',
    definition: 'ejecución programática de acciones sin intervención humana constante.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'agent',
    definition: 'sistema que decide acciones usando reglas, modelos o herramientas, más general que un bot fijo.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'AI agent',
    definition: 'agente que incorpora modelos de IA para razonamiento, clasificación o planificación.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'deterministic agent',
    definition: 'agente cuyas reglas producen siempre el mismo resultado para la misma entrada.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'non-deterministic agent',
    definition: 'agente cuyo resultado puede variar, como ocurre con muchos LLMs.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'LLM',
    definition: 'Large Language Model; modelo que genera/procesa lenguaje y no forma parte nativa del consenso blockchain.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'inference',
    definition: 'proceso de ejecutar un modelo de IA para obtener una salida.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'model latency',
    definition: 'tiempo que tarda un modelo en generar una respuesta.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'token (LLM)',
    definition: 'unidad de texto procesada por un modelo; no tiene relación con un token crypto.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'token (crypto)',
    definition: 'activo digital administrado por un programa blockchain.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'prompt',
    definition: 'entrada textual enviada a un modelo de IA.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'structured output',
    definition: 'salida del modelo obligada a respetar una estructura como JSON.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'hallucination',
    definition: 'salida incorrecta/inventada de un modelo que puede parecer plausible.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'guardrail',
    definition: 'regla que restringe qué acciones/salidas puede producir un agente.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'verification layer',
    definition: 'componente que comprueba una salida antes de aceptarla o ejecutarla.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'human-in-the-loop',
    definition: 'diseño donde una persona debe aprobar ciertas decisiones antes de ejecutarlas.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'autonomous execution',
    definition: 'sistema capaz de tomar y ejecutar decisiones sin aprobación humana cada vez.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'paper mode',
    definition: 'modo donde decisiones se simulan pero no se envían a mercados reales.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'live mode',
    definition: 'modo donde las acciones se ejecutan con fondos reales.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'kill switch',
    definition: 'mecanismo inmediato para detener operaciones automáticas.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'circuit breaker',
    definition: 'regla automática que detiene actividad al superar ciertos límites de riesgo.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'max drawdown',
    definition: 'mayor caída de capital desde un máximo hasta un mínimo posterior.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'position sizing',
    definition: 'decisión de cuánto capital asignar a cada operación.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'exposure',
    definition: 'cantidad de capital/riesgo actualmente comprometido.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'risk limit',
    definition: 'máximo de exposición/pérdida autorizado.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'daily loss limit',
    definition: 'pérdida máxima permitida dentro de un día antes de frenar el sistema.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'whitelist',
    definition: 'término histórico para allowlist; lista de elementos autorizados.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'blacklist',
    definition: 'término histórico para denylist; lista de elementos bloqueados.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'policy',
    definition: 'conjunto formal de reglas que restringen acciones.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'auditability',
    definition: 'capacidad de reconstruir y explicar qué hizo un sistema y por qué.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'provenance',
    definition: 'información sobre el origen de datos, decisiones o artefactos.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'attestation',
    definition: 'declaración firmada/verificable de que cierto hecho o resultado cumple determinadas condiciones.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'oracle attestation',
    definition: 'afirmación firmada por un proveedor externo sobre un dato como precio o evento.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'cryptographic commitment',
    definition: 'hash u objeto que fija un dato sin necesariamente revelarlo.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'proof-of-reserves',
    definition: 'mecanismo para demostrar que una entidad posee determinados activos/reservas.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'proof-of-solvency',
    definition: 'prueba de que activos cubren obligaciones, más compleja que solo demostrar reservas.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'Merkle root',
    definition: 'hash raíz que resume criptográficamente todos los elementos de un Merkle tree.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'state root',
    definition: 'hash que representa de forma compacta un estado completo o conjunto de datos.',
    category: 'Consenso y red',
  },
  {
    term: 'checkpoint',
    definition: 'estado considerado estable usado como referencia para sincronización/verificación.',
    category: 'Consenso y red',
  },
  {
    term: 'finalized checkpoint',
    definition: 'checkpoint con suficiente respaldo para tratarse como definitivo según el protocolo.',
    category: 'Consenso y red',
  },
  {
    term: 'fork detection',
    definition: 'identificar que existen historias incompatibles temporales.',
    category: 'Consenso y red',
  },
  {
    term: 'slashing',
    definition: 'penalización económica a validators maliciosos o incorrectos en redes que implementan ese mecanismo; no todas las redes lo usan igual.',
    category: 'Economía y governance',
  },
  {
    term: 'economic security',
    definition: 'cantidad/incentivos económicos que hacen costoso atacar una blockchain.',
    category: 'Economía y governance',
  },
  {
    term: 'cryptoeconomics',
    definition: 'combinación de criptografía + incentivos económicos para diseñar protocolos resistentes a ataques.',
    category: 'Economía y governance',
  },
  {
    term: 'game theory',
    definition: 'análisis de cómo actores racionales responden a incentivos y reglas.',
    category: 'Economía y governance',
  },
  {
    term: 'incentive compatibility',
    definition: 'diseño donde seguir las reglas resulta económicamente racional.',
    category: 'Economía y governance',
  },
  {
    term: 'griefing attack',
    definition: 'ataque donde alguien acepta perder recursos para perjudicar a otros o al protocolo.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'DoS',
    definition: 'Denial of Service; saturar un sistema para impedir su funcionamiento normal.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'DDoS',
    definition: 'DoS distribuido desde muchas máquinas/orígenes.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'spam resistance',
    definition: 'mecanismos económicos/técnicos para que inundar la red resulte caro o limitado.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'censorship resistance',
    definition: 'dificultad de impedir selectivamente que usuarios válidos publiquen transacciones.',
    category: 'Consenso y red',
  },
  {
    term: 'censorship',
    definition: 'exclusión deliberada de ciertas transacciones por actores de la infraestructura.',
    category: 'Consenso y red',
  },
  {
    term: 'frontier',
    definition: 'estado más reciente conocido/aceptado de una cadena o protocolo.',
    category: 'Consenso y red',
  },
  {
    term: 'state sync',
    definition: 'proceso de alcanzar el estado actual de la red sin reproducir necesariamente todo desde genesis.',
    category: 'Cuentas y programas',
  },
  {
    term: 'bootstrap',
    definition: 'proceso inicial mediante el que un nodo/app obtiene configuración y empieza a sincronizarse.',
    category: 'Consenso y red',
  },
  {
    term: 'peer',
    definition: 'otro nodo con el que una máquina se comunica dentro de una red P2P.',
    category: 'Consenso y red',
  },
  {
    term: 'P2P',
    definition: 'peer-to-peer; comunicación directa entre nodos sin depender exclusivamente de un servidor central.',
    category: 'Consenso y red',
  },
  {
    term: 'network topology',
    definition: 'forma en la que los nodos están conectados entre sí.',
    category: 'Consenso y red',
  },
  {
    term: 'propagation',
    definition: 'difusión de transacciones, bloques o datos por la red.',
    category: 'Consenso y red',
  },
  {
    term: 'bandwidth',
    definition: 'cantidad de datos que una conexión puede transportar por unidad de tiempo.',
    category: 'Consenso y red',
  },
  {
    term: 'latency network',
    definition: 'demora en transmitir información entre dos máquinas.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'packet loss',
    definition: 'paquetes de red que no llegan a destino y deben retransmitirse o perderse.',
    category: 'Consenso y red',
  },
  {
    term: 'throughput network',
    definition: 'cantidad efectiva de datos transmitidos por segundo.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'serialization overhead',
    definition: 'costo adicional de convertir/transportar estructuras en formatos binarios o textuales.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'JSON-RPC',
    definition: 'protocolo donde clientes llaman métodos remotos usando mensajes JSON; Solana RPC expone muchas operaciones así.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'HTTP RPC',
    definition: 'llamadas RPC realizadas mediante HTTP.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'WebSocket RPC',
    definition: 'canal persistente para recibir notificaciones en tiempo real.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'endpoint',
    definition: 'URL de un servicio RPC/API.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'API key',
    definition: 'secreto usado por proveedores para autenticar y limitar acceso a sus APIs.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'rate quota',
    definition: 'cantidad de requests/uso permitido por un proveedor en un período.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'archive data',
    definition: 'historial antiguo conservado para consultas profundas.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'indexing latency',
    definition: 'demora entre que ocurre una transacción y que un indexador la hace consultable.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'eventual consistency',
    definition: 'algunos servicios/indexadores pueden tardar unos segundos en reflejar exactamente el último estado.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'source of truth',
    definition: 'sistema considerado autoridad para un dato; en blockchain suele ser el estado on-chain, no un indexador externo.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'canonical data',
    definition: 'datos considerados oficiales según el consenso actual.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'derived data',
    definition: 'información calculada a partir de datos on-chain, como PnL o analytics.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'analytics',
    definition: 'métricas y análisis construidos a partir de actividad blockchain.',
    category: 'Infra, RPC y datos',
  },
  {
    term: 'wallet attribution',
    definition: 'intento de asociar addresses con entidades o comportamientos concretos.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'cluster analysis',
    definition: 'agrupar addresses según patrones de transacciones; no garantiza identidad real.',
    category: 'Identidad y compliance',
  },
  {
    term: 'privacy',
    definition: 'protección contra exposición innecesaria de identidad, balances o actividad.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'pseudonymity',
    definition: 'uso de addresses sin nombre real explícito, aunque la actividad pueda ser pública y rastreable.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'anonymity',
    definition: 'imposibilidad práctica de vincular actividad con identidad; las blockchains públicas normalmente no garantizan anonimato total.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'KYC',
    definition: 'Know Your Customer; proceso de verificación de identidad usado por entidades reguladas.',
    category: 'Identidad y compliance',
  },
  {
    term: 'AML',
    definition: 'Anti-Money Laundering; controles para prevenir lavado de dinero y actividades ilícitas.',
    category: 'Identidad y compliance',
  },
  {
    term: 'compliance',
    definition: 'cumplimiento de leyes, normas y políticas aplicables.',
    category: 'Identidad y compliance',
  },
  {
    term: 'permissioned transfer',
    definition: 'transferencia permitida solo si se cumplen determinadas reglas/identidades.',
    category: 'Identidad y compliance',
  },
  {
    term: 'sanctions screening',
    definition: 'revisión de addresses/entidades contra listas de sanciones según requisitos regulatorios.',
    category: 'Identidad y compliance',
  },
  {
    term: 'custodian',
    definition: 'entidad que mantiene activos o claves en nombre de clientes.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'exchange deposit address',
    definition: 'address usada para depositar fondos en una cuenta de exchange centralizado.',
    category: 'Seguridad y custodia',
  },
  {
    term: 'memo',
    definition: 'dato adicional opcional en ciertas transacciones usado para identificación/reconciliación.',
    category: 'Transacciones y fees',
  },
  {
    term: 'memo program',
    definition: 'programa simple de Solana para adjuntar texto/datos a transacciones.',
    category: 'Cuentas y programas',
  },
  {
    term: 'reference',
    definition: 'identificador utilizado por algunos protocolos de pagos para asociar una transacción con una orden/factura.',
    category: 'DeFi y trading',
  },
  {
    term: 'Solana Pay',
    definition: 'protocolo/estándar para pagos y solicitudes de transacciones usando links/QR.',
    category: 'DeFi y trading',
  },
  {
    term: 'QR payment',
    definition: 'codificación en QR de una dirección o solicitud de pago/transacción.',
    category: 'DeFi y trading',
  },
  {
    term: 'merchant',
    definition: 'comercio que recibe pagos.',
    category: 'DeFi y trading',
  },
  {
    term: 'settlement currency',
    definition: 'activo en el que finalmente se liquida una operación, por ejemplo USDC.',
    category: 'DeFi y trading',
  },
  {
    term: 'payment rail',
    definition: 'infraestructura utilizada para mover valor entre partes.',
    category: 'DeFi y trading',
  },
  {
    term: 'stable settlement',
    definition: 'liquidación usando activos relativamente estables como stablecoins.',
    category: 'DeFi y trading',
  },
  {
    term: 'escrow',
    definition: 'fondos bloqueados por un programa hasta que se cumple una condición.',
    category: 'DeFi y trading',
  },
  {
    term: 'vault',
    definition: 'account/programa donde un protocolo mantiene activos bajo reglas específicas.',
    category: 'DeFi y trading',
  },
  {
    term: 'treasury vault',
    definition: 'vault destinado a fondos de un protocolo/organización.',
    category: 'DeFi y trading',
  },
  {
    term: 'custody program',
    definition: 'programa que mantiene/controla activos según reglas definidas.',
    category: 'DeFi y trading',
  },
  {
    term: 'signer PDA',
    definition: 'PDA usada por un programa para autorizar CPI bajo seeds correctas.',
    category: 'Cuentas y programas',
  },
  {
    term: 'vault authority',
    definition: 'PDA/clave autorizada a controlar un vault.',
    category: 'DeFi y trading',
  },
  {
    term: 'escrow state',
    definition: 'account que registra partes, montos y condiciones de un escrow.',
    category: 'DeFi y trading',
  },
  {
    term: 'order',
    definition: 'instrucción/estado que representa intención de comprar o vender.',
    category: 'DeFi y trading',
  },
  {
    term: 'matching engine',
    definition: 'sistema que empareja órdenes de compra y venta.',
    category: 'DeFi y trading',
  },
  {
    term: 'central limit order book (CLOB)',
    definition: 'libro central de órdenes con precios y cantidades.',
    category: 'DeFi y trading',
  },
  {
    term: 'OpenBook',
    definition: 'protocolo/order book del ecosistema Solana derivado del legado de Serum.',
    category: 'DeFi y trading',
  },
  {
    term: 'Phoenix',
    definition: 'DEX/order book diseñado para Solana con fuerte foco on-chain.',
    category: 'DeFi y trading',
  },
  {
    term: 'Raydium',
    definition: 'protocolo/DEX/AMM popular en Solana.',
    category: 'DeFi y trading',
  },
  {
    term: 'Orca',
    definition: 'DEX/AMM popular en Solana.',
    category: 'DeFi y trading',
  },
  {
    term: 'Meteora',
    definition: 'protocolo de liquidez/DEX del ecosistema Solana.',
    category: 'DeFi y trading',
  },
  {
    term: 'Drift',
    definition: 'protocolo Solana para perpetuals, spot y otros productos DeFi.',
    category: 'DeFi y trading',
  },
  {
    term: 'Kamino',
    definition: 'protocolo DeFi en Solana relacionado con lending, liquidity y estrategias.',
    category: 'DeFi y trading',
  },
  {
    term: 'margin',
    definition: 'collateral usado para respaldar posiciones apalancadas.',
    category: 'DeFi y trading',
  },
  {
    term: 'margin account',
    definition: 'account que registra collateral y posiciones de un usuario.',
    category: 'DeFi y trading',
  },
  {
    term: 'health factor',
    definition: 'métrica que indica cuánto margen de seguridad tiene una posición antes de liquidación.',
    category: 'DeFi y trading',
  },
  {
    term: 'borrow',
    definition: 'tomar activos prestados aportando collateral según reglas del protocolo.',
    category: 'DeFi y trading',
  },
  {
    term: 'lend',
    definition: 'prestar activos a un protocolo/mercado para obtener rendimiento.',
    category: 'DeFi y trading',
  },
  {
    term: 'interest rate',
    definition: 'costo/rendimiento porcentual asociado a préstamos.',
    category: 'DeFi y trading',
  },
  {
    term: 'utilization',
    definition: 'proporción de liquidez prestada respecto de la disponible; suele influir en tasas.',
    category: 'DeFi y trading',
  },
  {
    term: 'liquidator',
    definition: 'actor/bot que ejecuta liquidaciones cuando una posición queda por debajo del umbral requerido.',
    category: 'DeFi y trading',
  },
  {
    term: 'flash loan',
    definition: 'préstamo que debe tomarse y devolverse dentro de la misma transacción atómica.',
    category: 'DeFi y trading',
  },
  {
    term: 'atomic arbitrage',
    definition: 'arbitraje ejecutado completamente dentro de una transacción, de modo que si no es rentable todo falla.',
    category: 'DeFi y trading',
  },
  {
    term: 'flash fill',
    definition: 'patrón donde liquidez temporal permite completar una operación compleja dentro de una misma transacción.',
    category: 'DeFi y trading',
  },
  {
    term: 'oracle update',
    definition: 'publicación de un nuevo dato/precio por el oracle.',
    category: 'DeFi y trading',
  },
  {
    term: 'stale price',
    definition: 'precio demasiado viejo para considerarse seguro.',
    category: 'DeFi y trading',
  },
  {
    term: 'confidence interval',
    definition: 'rango de incertidumbre publicado por algunos oracles junto con el precio.',
    category: 'DeFi y trading',
  },
  {
    term: 'TWAP',
    definition: 'Time-Weighted Average Price; precio promedio ponderado por tiempo para reducir manipulación de movimientos instantáneos.',
    category: 'DeFi y trading',
  },
  {
    term: 'VWAP',
    definition: 'Volume-Weighted Average Price; precio promedio ponderado por volumen negociado.',
    category: 'DeFi y trading',
  },
  {
    term: 'mark price',
    definition: 'precio de referencia usado por mercados de derivados para PnL/liquidaciones.',
    category: 'DeFi y trading',
  },
  {
    term: 'index price',
    definition: 'precio externo/compuesto usado como referencia de un derivado.',
    category: 'DeFi y trading',
  },
  {
    term: 'funding rate',
    definition: 'pagos periódicos entre longs y shorts en perpetuals para mantener precio cerca del spot.',
    category: 'DeFi y trading',
  },
  {
    term: 'long',
    definition: 'posición que gana si el precio sube.',
    category: 'DeFi y trading',
  },
  {
    term: 'short',
    definition: 'posición que gana si el precio baja.',
    category: 'DeFi y trading',
  },
  {
    term: 'spot',
    definition: 'compra/venta directa del activo.',
    category: 'DeFi y trading',
  },
  {
    term: 'derivative',
    definition: 'instrumento cuyo valor depende de otro activo subyacente.',
    category: 'DeFi y trading',
  },
  {
    term: 'settlement price',
    definition: 'precio usado para cerrar/liquidar contratos.',
    category: 'DeFi y trading',
  },
  {
    term: 'liquidation price',
    definition: 'precio aproximado donde una posición será liquidada.',
    category: 'DeFi y trading',
  },
  {
    term: 'margin call',
    definition: 'advertencia/requisito de aportar más collateral antes de liquidación, según sistema.',
    category: 'DeFi y trading',
  },
  {
    term: 'isolated margin',
    definition: 'riesgo/collateral limitado a una posición concreta.',
    category: 'DeFi y trading',
  },
  {
    term: 'cross margin',
    definition: 'collateral compartido entre varias posiciones.',
    category: 'DeFi y trading',
  },
  {
    term: 'hedge',
    definition: 'operación usada para reducir riesgo de otra exposición.',
    category: 'DeFi y trading',
  },
  {
    term: 'delta',
    definition: 'sensibilidad del valor de una posición a cambios en el precio del activo subyacente.',
    category: 'DeFi y trading',
  },
  {
    term: 'market neutral',
    definition: 'estrategia diseñada para reducir exposición direccional al mercado.',
    category: 'DeFi y trading',
  },
  {
    term: 'arbitrage bot',
    definition: 'bot que busca diferencias de precio entre mercados.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'liquidation bot',
    definition: 'bot que detecta y ejecuta liquidaciones rentables.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'sniper bot',
    definition: 'bot que intenta comprar activos extremadamente rápido en eventos/lanzamientos; suele implicar riesgos técnicos y de mercado muy altos.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'copy trading',
    definition: 'replicar operaciones de otra wallet/trader.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'signal',
    definition: 'información que sugiere una posible acción de trading.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'alpha',
    definition: 'ventaja informativa o estratégica que potencialmente genera rendimiento superior.',
    category: 'Bots y agentes IA',
  },
  {
    term: 'backrun',
    definition: 'operación colocada inmediatamente después de otra para capturar una oportunidad creada por ella.',
    category: 'DeFi y trading',
  },
  {
    term: 'front-run',
    definition: 'operación colocada antes de otra para beneficiarse de su efecto esperado.',
    category: 'DeFi y trading',
  },
  {
    term: 'sandwich',
    definition: 'combinación front-run + operación de víctima + backrun.',
    category: 'DeFi y trading',
  },
  {
    term: 'mempool visibility',
    definition: 'capacidad de ver transacciones pendientes antes de ejecución; varía mucho según arquitectura e infraestructura.',
    category: 'Transacciones y fees',
  },
  {
    term: 'private order flow',
    definition: 'transacciones enviadas por canales privados a determinados builders/validators en vez de difusión pública amplia.',
    category: 'DeFi y trading',
  },
  {
    term: 'order flow auction',
    definition: 'sistema donde distintos actores compiten por ejecutar órdenes del usuario de forma favorable.',
    category: 'DeFi y trading',
  },
  {
    term: 'best execution',
    definition: 'intento de conseguir mejor precio/costo total para una operación.',
    category: 'DeFi y trading',
  },
  {
    term: 'execution quality',
    definition: 'medida combinada de precio, slippage, fees, latency y probabilidad de ejecución.',
    category: 'DeFi y trading',
  },
  {
    term: 'fill',
    definition: 'parte o totalidad de una orden que efectivamente se ejecutó.',
    category: 'DeFi y trading',
  },
  {
    term: 'partial fill',
    definition: 'cuando solo una parte de la cantidad solicitada se ejecuta.',
    category: 'DeFi y trading',
  },
  {
    term: 'fill price',
    definition: 'precio real al que se ejecutó una operación.',
    category: 'DeFi y trading',
  },
  {
    term: 'quote asset',
    definition: 'activo usado como unidad de precio, por ejemplo USDC en SOL/USDC.',
    category: 'DeFi y trading',
  },
  {
    term: 'base asset',
    definition: 'activo cuyo precio se expresa, por ejemplo SOL en SOL/USDC.',
    category: 'DeFi y trading',
  },
  {
    term: 'pair',
    definition: 'combinación de dos activos negociados, como SOL/USDC.',
    category: 'DeFi y trading',
  },
  {
    term: 'pool address',
    definition: 'address que identifica una pool específica.',
    category: 'DeFi y trading',
  },
  {
    term: 'reserve',
    definition: 'cantidad de activos guardados por una pool.',
    category: 'DeFi y trading',
  },
  {
    term: 'constant product',
    definition: 'fórmula AMM clásica x*y=k.',
    category: 'DeFi y trading',
  },
  {
    term: 'concentrated liquidity',
    definition: 'liquidez asignada a rangos de precio específicos en vez de todo el rango.',
    category: 'DeFi y trading',
  },
  {
    term: 'tick',
    definition: 'intervalo discreto de precios usado por algunos AMMs de liquidez concentrada.',
    category: 'DeFi y trading',
  },
  {
    term: 'tick array',
    definition: 'estructura que agrupa ticks/rangos en ciertos AMMs de Solana.',
    category: 'DeFi y trading',
  },
  {
    term: 'LP token',
    definition: 'token que representa participación en una pool de liquidez.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'fee tier',
    definition: 'nivel de comisión cobrado por una pool/mercado.',
    category: 'DeFi y trading',
  },
  {
    term: 'protocol revenue',
    definition: 'ingresos que captura directamente el protocolo.',
    category: 'DeFi y trading',
  },
  {
    term: 'LP fees',
    definition: 'comisiones distribuidas a proveedores de liquidez.',
    category: 'DeFi y trading',
  },
  {
    term: 'rebalance',
    definition: 'ajustar distribución de activos/posiciones para volver a una estrategia objetivo.',
    category: 'DeFi y trading',
  },
  {
    term: 'auto-compound',
    definition: 'reinvertir automáticamente recompensas para aumentar posición.',
    category: 'DeFi y trading',
  },
  {
    term: 'yield farming',
    definition: 'mover/aportar capital en protocolos buscando incentivos/rendimientos.',
    category: 'DeFi y trading',
  },
  {
    term: 'incentive token',
    definition: 'token adicional entregado para atraer liquidez/actividad.',
    category: 'Economía y governance',
  },
  {
    term: 'emissions schedule',
    definition: 'calendario de distribución de recompensas nuevas.',
    category: 'Economía y governance',
  },
  {
    term: 'token launch',
    definition: 'creación y puesta en circulación inicial de un token.',
    category: 'Economía y governance',
  },
  {
    term: 'liquidity bootstrapping',
    definition: 'mecanismos para crear liquidez inicial para un nuevo activo.',
    category: 'DeFi y trading',
  },
  {
    term: 'fair launch',
    definition: 'distribución que intenta evitar asignaciones privilegiadas significativas, aunque cada proyecto define sus reglas.',
    category: 'Economía y governance',
  },
  {
    term: 'presale',
    definition: 'venta de tokens antes del lanzamiento público.',
    category: 'Economía y governance',
  },
  {
    term: 'ICO',
    definition: 'Initial Coin Offering; venta inicial de tokens para financiar un proyecto.',
    category: 'Economía y governance',
  },
  {
    term: 'IDO',
    definition: 'Initial DEX Offering; lanzamiento/venta de tokens a través de un DEX/plataforma descentralizada.',
    category: 'Economía y governance',
  },
  {
    term: 'TGE',
    definition: 'Token Generation Event; momento en el que un token se crea/distribuye oficialmente.',
    category: 'Economía y governance',
  },
  {
    term: 'vesting contract/program',
    definition: 'programa que libera tokens según un calendario.',
    category: 'Economía y governance',
  },
  {
    term: 'claim',
    definition: 'acción mediante la cual un usuario retira tokens/recompensas que ya tiene disponibles.',
    category: 'Economía y governance',
  },
  {
    term: 'Merkle distributor',
    definition: 'sistema que usa una Merkle root para permitir claims verificables de grandes listas de usuarios.',
    category: 'Economía y governance',
  },
  {
    term: 'airdrop claim',
    definition: 'proceso donde una wallet demuestra elegibilidad y recibe tokens.',
    category: 'Economía y governance',
  },
  {
    term: 'snapshot block/slot',
    definition: 'punto concreto de la blockchain usado para medir balances o actividad histórica.',
    category: 'Economía y governance',
  },
  {
    term: 'proof of eligibility',
    definition: 'evidencia de que una wallet cumple condiciones para una recompensa.',
    category: 'Economía y governance',
  },
  {
    term: 'anti-sybil',
    definition: 'mecanismos diseñados para evitar que una persona abuse creando muchas identidades/wallets.',
    category: 'Economía y governance',
  },
  {
    term: 'reputation',
    definition: 'puntuación asociada al comportamiento histórico de una entidad/wallet.',
    category: 'Identidad y compliance',
  },
  {
    term: 'on-chain identity',
    definition: 'identidad/reputación construida a partir de addresses, credenciales y actividad blockchain.',
    category: 'Identidad y compliance',
  },
  {
    term: 'credential',
    definition: 'prueba de una característica o permiso asociado a una entidad.',
    category: 'Identidad y compliance',
  },
  {
    term: 'verifiable credential',
    definition: 'credencial firmada criptográficamente cuya autenticidad puede verificarse.',
    category: 'Identidad y compliance',
  },
  {
    term: 'DID',
    definition: 'Decentralized Identifier; estándar de identificadores descentralizados.',
    category: 'Identidad y compliance',
  },
  {
    term: 'soulbound token',
    definition: 'token diseñado para no transferirse, usado como representación de credenciales/reputación en algunos sistemas.',
    category: 'Tokens y NFTs',
  },
  {
    term: 'proof of personhood',
    definition: 'mecanismo para intentar demostrar que una identidad representa una persona única.',
    category: 'Identidad y compliance',
  },
  {
    term: 'PoD',
    definition: 'depende del protocolo; puede significar distintas cosas, así que siempre hay que revisar la definición específica del whitepaper.',
    category: 'Conceptos generales',
  },
  {
    term: 'whitepaper',
    definition: 'documento técnico/económico que describe cómo pretende funcionar un protocolo.',
    category: 'Conceptos generales',
  },
  {
    term: 'spec',
    definition: 'especificación formal o semiformal de reglas técnicas del sistema.',
    category: 'Conceptos generales',
  },
  {
    term: 'protocol parameter',
    definition: 'valor configurable que afecta comportamiento del protocolo, como target, timeout o tamaño de ronda.',
    category: 'Conceptos generales',
  },
  {
    term: 'round',
    definition: 'ciclo temporal/lógico donde participantes compiten o producen resultados.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'round window',
    definition: 'intervalo permitido para enviar una solución en determinada ronda.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'challenge nonce',
    definition: 'nonce concreto ligado a un desafío para impedir reutilizar soluciones anteriores.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'domain',
    definition: 'conjunto de restricciones bajo las cuales debe producirse una solución.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'structural filter',
    definition: 'reglas que verifican formato/contenido básico de una salida antes de considerarla candidata.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'valid attempt',
    definition: 'intento que pasa las reglas estructurales mínimas.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'invalid attempt',
    definition: 'intento que falla alguna condición antes de poder considerarse solución.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'accepted solution',
    definition: 'solución que pasa todas las verificaciones del protocolo.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'rejected solution',
    definition: 'solución enviada pero rechazada porque no satisface alguna regla.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'verification cost',
    definition: 'recursos necesarios para comprobar una solución.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'generation cost',
    definition: 'recursos necesarios para producir una solución candidata.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'asymmetric work',
    definition: 'propiedad deseable donde generar una solución cuesta mucho más que verificarla.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'benchmark',
    definition: 'prueba controlada para medir rendimiento de hardware/software.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'latency benchmark',
    definition: 'benchmark centrado en tiempo de respuesta.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'throughput benchmark',
    definition: 'benchmark centrado en cantidad de operaciones por segundo.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'p50',
    definition: 'mediana; 50% de las mediciones están por debajo de ese valor.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'p90',
    definition: 'valor debajo del cual cae aproximadamente el 90% de las mediciones.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'p99',
    definition: 'valor que cubre aproximadamente el 99% de los casos y muestra la cola lenta.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'worst case',
    definition: 'peor valor observado en la muestra.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'sample size',
    definition: 'cantidad de observaciones usadas en una medición.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'warmup',
    definition: 'ejecuciones iniciales descartadas para evitar distorsión por carga en frío/caches.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'cold start',
    definition: 'primera ejecución más lenta porque el sistema todavía debe cargar modelo, caches o recursos.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'benchmark variance',
    definition: 'variación natural entre distintas mediciones del mismo proceso.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'confidence interval (estadística)',
    definition: 'rango estadístico que expresa incertidumbre sobre una estimación.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'mean',
    definition: 'promedio aritmético.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'median',
    definition: 'valor central de una muestra ordenada.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'standard deviation',
    definition: 'medida de dispersión respecto del promedio.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'outlier',
    definition: 'medición muy alejada del comportamiento habitual.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'hash attempts',
    definition: 'cantidad de hashes probados antes de encontrar uno válido.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'failed hashes',
    definition: 'hashes que no cumplen el target.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'successful hash',
    definition: 'hash que sí cumple la condición requerida.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'expected time to success',
    definition: 'tiempo promedio esperado hasta encontrar una solución dadas dificultad y hashrate.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'probability per hash',
    definition: 'probabilidad de que un hash individual satisfaga el target.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'geometric distribution',
    definition: 'distribución estadística que modela cuántos intentos independientes hacen falta hasta el primer éxito.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'random oracle model',
    definition: 'modelo teórico donde una función hash se trata como si produjera resultados aleatorios ideales.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'nonce space',
    definition: 'conjunto de valores de nonce que pueden probarse.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'search space',
    definition: 'conjunto total de candidatos que un algoritmo puede explorar.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'parallel hashing',
    definition: 'calcular muchos hashes simultáneamente usando varios cores/GPU.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'sequential work',
    definition: 'trabajo que debe realizarse en orden y no puede paralelizarse fácilmente.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'ASIC',
    definition: 'hardware diseñado específicamente para una tarea, como hashing de Bitcoin.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'GPU',
    definition: 'procesador altamente paralelo útil para gráficos, IA y algunos tipos de cómputo.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'CPU',
    definition: 'procesador generalista optimizado para tareas variadas y control lógico.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'VRAM',
    definition: 'memoria dedicada de una GPU.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'RAM',
    definition: 'memoria principal usada por CPU y aplicaciones.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'memory bandwidth',
    definition: 'velocidad a la que hardware puede leer/escribir memoria.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'compute-bound',
    definition: 'tarea limitada principalmente por capacidad de cálculo.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'memory-bound',
    definition: 'tarea limitada principalmente por acceso/ancho de banda de memoria.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'I/O-bound',
    definition: 'tarea limitada principalmente por entrada/salida como red o disco.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'benchmark fairness',
    definition: 'diseñar pruebas para comparar participantes sin favorecer accidentalmente un tipo de hardware.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'hardware class',
    definition: 'categoría de hardware usada como referencia en un protocolo o benchmark.',
    category: 'Métricas y benchmarks',
  },
  {
    term: 'centralization pressure',
    definition: 'característica que favorece tanto a hardware/actores grandes que la participación termina concentrándose.',
    category: 'Economía y governance',
  },
  {
    term: 'economic barrier',
    definition: 'costo mínimo de hardware/capital para participar competitivamente.',
    category: 'Economía y governance',
  },
  {
    term: 'permissionless participation',
    definition: 'posibilidad de que cualquiera compita sin autorización previa.',
    category: 'Consenso y red',
  },
  {
    term: 'validator economics',
    definition: 'costos, recompensas y riesgos de operar un validator.',
    category: 'Economía y governance',
  },
  {
    term: 'miner',
    definition: 'participante que realiza PoW en redes que usan minería; Solana validators no son miners de PoW.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'mining',
    definition: 'búsqueda de soluciones PoW para producir/validar bloques en redes como Bitcoin.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'block producer',
    definition: 'entidad que construye/proporciona un bloque o conjunto de transacciones válido según el protocolo.',
    category: 'Consenso y red',
  },
  {
    term: 'sequencer',
    definition: 'componente que ordena transacciones en ciertas arquitecturas blockchain/L2.',
    category: 'Consenso y red',
  },
  {
    term: 'proposer',
    definition: 'actor que propone un bloque o estado candidato.',
    category: 'Consenso y red',
  },
  {
    term: 'attester',
    definition: 'actor que certifica/vota sobre propuestas en determinados protocolos.',
    category: 'Consenso y red',
  },
  {
    term: 'prover',
    definition: 'actor que genera una prueba criptográfica.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'verifier',
    definition: 'actor o programa que comprueba una prueba.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'proof system',
    definition: 'conjunto de algoritmos y reglas para producir/verificar pruebas.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'validity proof',
    definition: 'prueba de que una transición de estado es correcta.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'fraud proof',
    definition: 'prueba de que una transición o resultado fue incorrecto, usada en ciertos sistemas optimistas.',
    category: 'Criptografía y PoW',
  },
  {
    term: 'challenge period',
    definition: 'ventana temporal durante la cual puede cuestionarse un resultado.',
    category: 'Consenso y red',
  },
  {
    term: 'settlement finality',
    definition: 'momento en que el resultado económico se considera definitivamente liquidado.',
    category: 'Consenso y red',
  },
];
