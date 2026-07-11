describe('api.raw.game', function () {
  this.slow(2000)
  this.timeout(5000)

  describe('.mapStats (rooms, statName, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.genUniqueObjectName (type, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.checkUniqueObjectName (type, name, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.placeSpawn (room, x, y, name, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.createFlag (room, x, y, name, color = 1, secondaryColor = 1, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.genUniqueFlagName (shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.checkUniqueFlagName (name, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.changeFlagColor (color = 1, secondaryColor = 1, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.removeFlag (room, name, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.addObjectIntent (room, name, intent, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.createConstruction (room, x, y, structureType, name, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.setNotifyWhenAttacked (_id, enabled = true, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.createInvader (room, x, y, size, type, boosted = false, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.removeInvader (_id, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.gameTime (shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.gameWorldSize (shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.gameRoomTerrain (room, encoded = 1, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.gameRoomStatus (room, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.gameRoomOverview (room, interval = 8, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.gameMarketOrdersIndex (shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.gameMarketMyOrders ()', function () {
    it('should do untested things (for now)')
  })

  describe('.gameMarketOrders (resourceType, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  describe('.gameMarketStats (resourceType, shard = DEFAULT_SHARD)', function () {
    it('should do untested things (for now)')
  })

  // This endpoint is not implemented on S+
  describe.skip('.gameShardsInfo ()', function () {
    it('should send a request to /api/shards/info and return shards informations', async function () {
      // placeholder for official server integration test
    })
  })
})
